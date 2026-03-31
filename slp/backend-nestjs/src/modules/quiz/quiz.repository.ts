import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { Quiz } from "./quiz.entity";
import { QuizQuestion } from "./quiz-question.entity";
import { QuizTag } from "./quiz-tag.entity";
import { QuizNote } from "./quiz-note.entity";
import { QuizSource } from "./quiz-source.entity";
import { Note } from "../note/note.entity";
import { Source } from "../source/source.entity";
import { Tag } from "../tag/tag.entity";
import { TopQuizDto } from "../dashboard/dto/top-quiz.dto"; // Adjust import path

@Injectable()
export class QuizRepository {
  constructor(
    @InjectRepository(Quiz)
    private quizRepo: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private quizQuestionRepo: Repository<QuizQuestion>,
    @InjectRepository(QuizTag)
    private quizTagRepo: Repository<QuizTag>,
    @InjectRepository(QuizNote)
    private quizNoteRepo: Repository<QuizNote>,
    @InjectRepository(QuizSource)
    private quizSourceRepo: Repository<QuizSource>,
    @InjectRepository(Note)
    private noteRepo: Repository<Note>,
    @InjectRepository(Source)
    private sourceRepo: Repository<Source>,
  ) {}

  async getById(id: number, includeDisabled = false): Promise<Quiz | null> {
    let query = this.quizRepo
      .createQueryBuilder("quiz")
      .leftJoinAndSelect("quiz.user", "user")
      .leftJoinAndSelect("quiz.quizQuestions", "quizQuestions")
      .leftJoinAndSelect("quiz.quizTags", "quizTags")
      .leftJoinAndSelect("quizTags.tag", "tag")
      .leftJoinAndSelect("quiz.quizNotes", "quizNotes")
      .leftJoinAndSelect("quizNotes.note", "note")
      .leftJoinAndSelect("quiz.quizSources", "quizSources")
      .leftJoinAndSelect("quizSources.source", "source")
      .where("quiz.id = :id", { id });

    if (!includeDisabled) {
      query = query.andWhere("quiz.disabled = false");
    }

    return query.getOne();
  }

  async getUserQuizzes(
    userId: number,
    includeDisabled = false,
  ): Promise<Quiz[]> {
    let query = this.quizRepo
      .createQueryBuilder("quiz")
      .leftJoinAndSelect("quiz.user", "user")
      .leftJoinAndSelect("quiz.quizQuestions", "quizQuestions")
      .leftJoinAndSelect("quiz.quizTags", "quizTags")
      .leftJoinAndSelect("quizTags.tag", "tag")
      .where("quiz.userId = :userId", { userId });

    if (!includeDisabled) {
      query = query.andWhere("quiz.disabled = false");
    }

    return query.orderBy("quiz.updatedAt", "DESC").getMany();
  }

  async getPublicQuizzes(
    visibility?: string,
    includeDisabled = false,
  ): Promise<Quiz[]> {
    let query = this.quizRepo
      .createQueryBuilder("quiz")
      .leftJoinAndSelect("quiz.user", "user")
      .leftJoinAndSelect("quiz.quizQuestions", "quizQuestions")
      .leftJoinAndSelect("quiz.quizTags", "quizTags")
      .leftJoinAndSelect("quizTags.tag", "tag");

    if (!includeDisabled) {
      query = query.andWhere("quiz.disabled = false");
    }

    if (!visibility || visibility === "public") {
      query = query.andWhere("quiz.visibility = :visibility", {
        visibility: "public",
      });
    } else if (visibility === "unlisted") {
      query = query.andWhere("quiz.visibility = :visibility", {
        visibility: "unlisted",
      });
    }

    return query.orderBy("quiz.createdAt", "DESC").getMany();
  }

  async create(quiz: Quiz): Promise<Quiz> {
    const saved = await this.quizRepo.save(quiz);
    const reloaded = await this.getById(saved.id);

    if (!reloaded) {
      throw new Error(`Failed to reload quiz after creation (ID: ${saved.id})`);
    }

    return reloaded;
  }

  async update(quiz: Quiz): Promise<void> {
    quiz.updatedAt = new Date();
    await this.quizRepo.save(quiz);
  }

  async hardDelete(id: number): Promise<void> {
    await this.quizRepo.delete(id);
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.quizRepo.count({ where: { id, disabled: false } });
    return count > 0;
  }

  async search(
    searchTerm?: string,
    userId?: number,
    visibility?: string,
    includeDisabled = false,
    sortBy?: string,
    sortOrder?: "asc" | "desc",
    page = 1,
    pageSize = 20,
  ): Promise<{ items: Quiz[]; totalCount: number }> {
    let query = this.quizRepo
      .createQueryBuilder("quiz")
      .leftJoinAndSelect("quiz.user", "user")
      .leftJoinAndSelect("quiz.quizQuestions", "quizQuestions")
      .leftJoinAndSelect("quiz.quizTags", "quizTags")
      .leftJoinAndSelect("quizTags.tag", "tag");

    if (!includeDisabled) {
      query = query.andWhere("quiz.disabled = false");
    } else {
      // If includeDisabled, we must also include disabled quizzes
      // (no filter on disabled)
    }

    if (userId) {
      query = query.andWhere("quiz.userId = :userId", { userId });
    }

    if (visibility) {
      query = query.andWhere("quiz.visibility = :visibility", { visibility });
    } else if (!userId) {
      // Public listing, default to public
      query = query.andWhere("quiz.visibility = :visibility", {
        visibility: "public",
      });
    }

    if (searchTerm) {
      query = query.andWhere(
        "(quiz.title ILIKE :search OR quiz.description ILIKE :search)",
        { search: `%${searchTerm}%` },
      );
    }

    // Sorting
    const order = sortOrder === "asc" ? "ASC" : "DESC";
    if (sortBy === "title") {
      query = query.orderBy("quiz.title", order);
    } else {
      query = query.orderBy("quiz.createdAt", order);
    }

    const totalCount = await query.getCount();

    const items = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { items, totalCount };
  }

  // ---------- QuizQuestion ----------
  async getQuestionsByQuizId(quizId: number): Promise<QuizQuestion[]> {
    return this.quizQuestionRepo.find({
      where: { quizId },
      order: { displayOrder: "ASC" },
    });
  }

  async getQuizQuestionById(id: number): Promise<QuizQuestion | null> {
    return this.quizQuestionRepo.findOne({
      where: { id },
      relations: ["quiz"],
    });
  }

  async createQuizQuestion(quizQuestion: QuizQuestion): Promise<QuizQuestion> {
    quizQuestion.createdAt = new Date();
    quizQuestion.updatedAt = new Date();
    return this.quizQuestionRepo.save(quizQuestion);
  }

  async updateQuizQuestion(quizQuestion: QuizQuestion): Promise<void> {
    quizQuestion.updatedAt = new Date();
    await this.quizQuestionRepo.save(quizQuestion);
  }

  async deleteQuizQuestion(id: number): Promise<void> {
    await this.quizQuestionRepo.delete(id);
  }

  async reorderQuizQuestions(
    quizId: number,
    questionIds: number[],
  ): Promise<void> {
    const questions = await this.quizQuestionRepo.find({ where: { quizId } });
    for (let i = 0; i < questionIds.length; i++) {
      const q = questions.find((qq) => qq.id === questionIds[i]);
      if (q) {
        q.displayOrder = i + 1;
        q.updatedAt = new Date();
      }
    }
    await this.quizQuestionRepo.save(questions);
  }

  // ---------- Notes ----------
  async getNotesByQuizId(quizId: number): Promise<Note[]> {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId, disabled: false },
      relations: ["quizNotes", "quizNotes.note"],
    });
    return quiz?.quizNotes.map((qn) => qn.note) ?? [];
  }

  async addNoteToQuiz(quizId: number, noteId: number): Promise<void> {
    const quizNote = this.quizNoteRepo.create({ quizId, noteId });
    await this.quizNoteRepo.save(quizNote);
  }

  async removeNoteFromQuiz(quizId: number, noteId: number): Promise<void> {
    await this.quizNoteRepo.delete({ quizId, noteId });
  }

  async createNoteAndAddToQuiz(
    quizId: number,
    userId: number,
    title: string,
    content: string,
  ): Promise<Note> {
    const note = this.noteRepo.create({
      userId,
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.noteRepo.save(note);
    await this.addNoteToQuiz(quizId, note.id);
    return note;
  }

  async getNoteByIdAndUser(
    noteId: number,
    userId: number,
  ): Promise<Note | null> {
    return this.noteRepo.findOne({ where: { id: noteId, userId } });
  }

  // ---------- Sources ----------
  async getSourcesByQuizId(quizId: number): Promise<Source[]> {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId, disabled: false },
      relations: ["quizSources", "quizSources.source"],
    });
    return quiz?.quizSources.map((qs) => qs.source) ?? [];
  }

  async addSourceToQuiz(quizId: number, sourceId: number): Promise<void> {
    const exists = await this.quizSourceRepo.findOne({
      where: { quizId, sourceId },
    });
    if (!exists) {
      const quizSource = this.quizSourceRepo.create({ quizId, sourceId });
      await this.quizSourceRepo.save(quizSource);
    }
  }

  async removeSourceFromQuiz(quizId: number, sourceId: number): Promise<void> {
    await this.quizSourceRepo.delete({ quizId, sourceId });
  }

  // ---------- Admin ----------
  async getAllForAdminPaginated(
    search?: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: Quiz[]; total: number }> {
    const query = this.quizRepo
      .createQueryBuilder("quiz")
      .leftJoinAndSelect("quiz.user", "user");

    if (search) {
      query.where(
        "(LOWER(quiz.title) LIKE :search OR LOWER(user.username) LIKE :search)",
        { search: `%${search.toLowerCase()}%` },
      );
    }

    const total = await query.getCount();

    const items = await query
      .orderBy("quiz.createdAt", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { items, total };
  }

  async getTopQuizzesByAttempts(limit: number): Promise<TopQuizDto[]> {
    // Note: This would require joining with QuizAttempts. Adjust according to your attempts entity.
    // This is a placeholder; you'll need to implement based on your actual attempt tables.
    const query = this.quizRepo
      .createQueryBuilder("quiz")
      .leftJoin("quiz.user", "user")
      .leftJoin("quiz.attempts", "attempt") // assuming attempts relation exists
      .select([
        "quiz.id AS id",
        "quiz.title AS title",
        "user.username AS authorUsername",
        "COUNT(attempt.id) AS attemptCount",
        // Add comment count, question count if needed
      ])
      .where("quiz.visibility = :visibility", { visibility: "public" })
      .andWhere("quiz.disabled = false")
      .groupBy("quiz.id, user.username")
      .orderBy("attemptCount", "DESC")
      .limit(limit);

    const results = await query.getRawMany();
    // Map to TopQuizDto
    return results.map((r) => ({
      id: r.id,
      title: r.title,
      authorUsername: r.authorUsername,
      attemptCount: parseInt(r.attemptCount, 10),
      commentCount: 0, // you need to join comments
      questionCount: 0,
    }));
  }

  async removeQuizTags(quizId: number): Promise<void> {
    await this.quizTagRepo.delete({ quizId });
  }
}
