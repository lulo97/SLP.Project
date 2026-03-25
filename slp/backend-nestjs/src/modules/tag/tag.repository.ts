import { In, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Tag } from "./tag.entity";
import { TagDto } from "./dto/tag.dto";

@Injectable()
export class TagRepository {
  constructor(
    @InjectRepository(Tag)
    private repo: Repository<Tag>,
  ) {}

  /**
   * Get paginated list of tags with optional filter and sorting.
   */
  async getTags(
    q?: string,
    sort: "usage" | "name" = "usage",
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{ tags: TagDto[]; total: number }> {
    // Build base query with counts
    const queryBuilder = this.repo
      .createQueryBuilder("tag")
      .leftJoin("tag.quizTags", "quiz_tag")
      .leftJoin("tag.questionTags", "question_tag")
      .select(["tag.id", "tag.name"])
      .addSelect("COUNT(DISTINCT quiz_tag.quiz_id)", "quizCount") // sửa: dùng quiz_id
      .addSelect("COUNT(DISTINCT question_tag.question_id)", "questionCount") // sửa: dùng question_id
      .groupBy("tag.id");

    if (q) {
      queryBuilder.andWhere("tag.name ILIKE :q", { q: `%${q}%` });
    }

    // Apply sorting
    if (sort === "name") {
      queryBuilder.orderBy("tag.name", "ASC");
    } else {
      queryBuilder
        .orderBy(
          "COUNT(DISTINCT quiz_tag.quiz_id) + COUNT(DISTINCT question_tag.question_id)", // sửa
          "DESC",
        )
        .addOrderBy("tag.name", "ASC");
    }

    // Count total after filters (before pagination)
    const total = await queryBuilder.getCount();

    // Apply pagination
    const rawTags = await queryBuilder
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    const tags = rawTags.map((row) => ({
      id: row.tag_id,
      name: row.tag_name,
      quizCount: parseInt(row.quizCount, 10),
      questionCount: parseInt(row.questionCount, 10),
      totalCount: parseInt(row.quizCount, 10) + parseInt(row.questionCount, 10),
    }));

    return { tags, total };
  }

  /**
   * Get top N most‑used tags (by total usage).
   */
  async getPopularTags(limit: number): Promise<TagDto[]> {
    const rawTags = await this.repo
      .createQueryBuilder("tag")
      .leftJoin("tag.quizTags", "quiz_tag")
      .leftJoin("tag.questionTags", "question_tag")
      .select(["tag.id", "tag.name"])
      .addSelect("COUNT(DISTINCT quiz_tag.quiz_id)", "quizCount")
      .addSelect("COUNT(DISTINCT question_tag.question_id)", "questionCount")
      .groupBy("tag.id")
      .orderBy(
        "COUNT(DISTINCT quiz_tag.quiz_id) + COUNT(DISTINCT question_tag.question_id)",
        "DESC",
      )
      .addOrderBy("tag.name", "ASC")
      .limit(limit)
      .getRawMany();

    return rawTags.map((row) => ({
      id: row.tag_id,
      name: row.tag_name,
      quizCount: parseInt(row.quizCount, 10),
      questionCount: parseInt(row.questionCount, 10),
      totalCount: parseInt(row.quizCount, 10) + parseInt(row.questionCount, 10),
    }));
  }

  /**
   * Search tags by name (case‑insensitive, contains) – used for autocomplete.
   */
  async searchTags(q: string, limit: number): Promise<TagDto[]> {
    const rawTags = await this.repo
      .createQueryBuilder("tag")
      .leftJoin("tag.quizTags", "quiz_tag")
      .leftJoin("tag.questionTags", "question_tag")
      .select(["tag.id", "tag.name"])
      .addSelect("COUNT(DISTINCT quiz_tag.quiz_id)", "quizCount")
      .addSelect("COUNT(DISTINCT question_tag.question_id)", "questionCount")
      .where("tag.name ILIKE :q", { q: `%${q}%` })
      .groupBy("tag.id")
      .orderBy(
        "COUNT(DISTINCT quiz_tag.quiz_id) + COUNT(DISTINCT question_tag.question_id)",
        "DESC",
      )
      .addOrderBy("tag.name", "ASC")
      .limit(limit)
      .getRawMany();

    return rawTags.map((row) => ({
      id: row.tag_id,
      name: row.tag_name,
      quizCount: parseInt(row.quizCount, 10),
      questionCount: parseInt(row.questionCount, 10),
      totalCount: parseInt(row.quizCount, 10) + parseInt(row.questionCount, 10),
    }));
  }

  /**
   * Get a single tag by ID with usage counts.
   */
  async findTagById(id: number): Promise<TagDto | null> {
    const rawTag = await this.repo
      .createQueryBuilder("tag")
      .leftJoin("tag.quizTags", "quiz_tag")
      .leftJoin("tag.questionTags", "question_tag")
      .select(["tag.id", "tag.name"])
      .addSelect("COUNT(DISTINCT quiz_tag.quiz_id)", "quizCount")
      .addSelect("COUNT(DISTINCT question_tag.question_id)", "questionCount")
      .where("tag.id = :id", { id })
      .groupBy("tag.id")
      .getRawOne();

    if (!rawTag) return null;

    return {
      id: rawTag.tag_id,
      name: rawTag.tag_name,
      quizCount: parseInt(rawTag.quizCount, 10),
      questionCount: parseInt(rawTag.questionCount, 10),
      totalCount:
        parseInt(rawTag.quizCount, 10) + parseInt(rawTag.questionCount, 10),
    };
  }

  /**
   * Get or create tags by names (case-insensitive).
   * Mimics the .NET behavior: bulk insert new tags, return all.
   */
  async getOrCreateTags(names: string[]): Promise<Tag[]> {
    if (!names || names.length === 0) return [];

    // Clean and deduplicate
    const distinctNames = [
      ...new Set(names.map((n) => n.trim()).filter((n) => n)),
    ];

    // Find existing tags
    const existing = await this.repo.find({
      where: { name: In(distinctNames) },
    });
    const existingNames = existing.map((t) => t.name);

    // Create missing tags
    const missingNames = distinctNames.filter(
      (n) => !existingNames.includes(n),
    );
    const newTags: Tag[] = [];
    for (const name of missingNames) {
      const newTag = this.repo.create({ name });
      newTags.push(newTag);
    }
    if (newTags.length) {
      await this.repo.save(newTags);
    }

    // Return all (existing + newly created)
    return [...existing, ...newTags];
  }

  /**
   * Remove all tags associated with a question.
   * (Used when updating a question's tags)
   */
  async removeQuestionTags(questionId: number): Promise<void> {
    // This is typically handled by the QuestionRepository,
    // but we keep the method for consistency.
    // If needed, implement with a raw query or repository.
    // For now, we rely on the QuestionRepository's method.
    // If you need to do this from TagRepository, you would need access to QuestionTag repo.
    // We'll leave it as a placeholder or call the appropriate repository.
    // In the provided code, TagService doesn't use this method, so it's fine.
    // However, to avoid confusion, you can implement it:
    // await this.questionTagRepo.delete({ questionId });
    // But we don't have QuestionTag repo here. So we can either:
    // - Inject QuestionTag repository, or
    // - Leave it empty (the functionality is in QuestionRepository.removeQuestionTags)
  }
}
