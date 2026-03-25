import { Repository, EntityRepository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Question } from "./question.entity";
import { QuestionTag } from "./question-tag.entity";

@Injectable()
export class QuestionRepository {
  constructor(
    @InjectRepository(Question)
    private repo: Repository<Question>,
    @InjectRepository(QuestionTag)
    private questionTagRepo: Repository<QuestionTag>,
  ) {}

  async findById(id: number): Promise<Question | null> {
    return this.repo.findOne({
      where: { id },
      relations: ["user", "questionTags", "questionTags.tag"],
    });
  }

  async findByUserId(userId: number): Promise<Question[]> {
    return this.repo.find({
      where: { userId },
      relations: ["user", "questionTags", "questionTags.tag"],
      order: { updatedAt: "DESC" },
    });
  }

  async findAll(): Promise<Question[]> {
    return this.repo.find({
      relations: ["user", "questionTags", "questionTags.tag"],
      order: { createdAt: "DESC" },
    });
  }

  async createQuestion(question: Question): Promise<Question> {
    const saved = await this.repo.save(question);
    // Since we just saved, we can assume it exists; we can still call findById but it's safe to return saved
    const result = await this.findById(saved.id);
    if (!result) {
      throw new Error("Failed to retrieve created question");
    }
    return result;
  }

  async updateQuestion(question: Question): Promise<Question> {
    question.updatedAt = new Date();
    const saved = await this.repo.save(question);
    const result = await this.findById(saved.id);
    if (!result) {
      throw new Error("Failed to retrieve updated question");
    }
    return result;
  }

  async deleteQuestion(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.repo.count({ where: { id } });
    return count > 0;
  }

  async search(
    searchTerm?: string,
    type?: string,
    tags?: string[],
    userId?: number,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ items: Question[]; totalCount: number }> {
    const queryBuilder = this.repo
      .createQueryBuilder("q")
      .leftJoinAndSelect("q.user", "user")
      .leftJoinAndSelect("q.questionTags", "qt")
      .leftJoinAndSelect("qt.tag", "tag");

    if (userId) {
      queryBuilder.andWhere("q.userId = :userId", { userId });
    }

    if (type) {
      queryBuilder.andWhere("q.type = :type", { type });
    }

    if (searchTerm) {
      queryBuilder.andWhere(
        "(q.content ILIKE :search OR q.explanation ILIKE :search)",
        { search: `%${searchTerm}%` },
      );
    }

    if (tags && tags.length > 0) {
      // We need questions that have at least all tags
      tags.forEach((tag, idx) => {
        queryBuilder.andWhere(
          `EXISTS (
          SELECT 1 FROM question_tag qt2
          JOIN tag t ON t.id = qt2.tag_id
          WHERE qt2.question_id = q.id AND t.name = :tag${idx}
        )`,
          { [`tag${idx}`]: tag },
        );
      });
    }

    const totalCount = await queryBuilder.getCount();

    const items = await queryBuilder
      .orderBy("q.updatedAt", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { items, totalCount };
  }

  async removeQuestionTags(questionId: number): Promise<void> {
    await this.questionTagRepo.delete({ questionId });
  }
}
