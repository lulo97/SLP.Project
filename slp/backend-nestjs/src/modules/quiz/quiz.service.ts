import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { QuizRepository } from "./quiz.repository";
import { TagRepository } from "../tag/tag.repository";
import { SourceRepository } from "../source/source.repository";
import { Quiz } from "./quiz.entity";
import { QuizDto, QuizListDto } from "./dto/quiz.dto";
import { CreateQuizDto } from "./dto/create-quiz.dto";
import { UpdateQuizDto } from "./dto/update-quiz.dto";
import {
  CreateQuizQuestionDto,
  UpdateQuizQuestionDto,
  QuizQuestionDto,
} from "./dto/quiz-question.dto";
import { AddNoteToQuizDto } from "./dto/add-note-to-quiz.dto";
import { AddSourceToQuizDto } from "./dto/add-source-to-quiz.dto";
import { NoteDto } from "../note/dto/note.dto";
import { SourceDto } from "src/modules/source/source.dto";
import { QuizSearchDto } from "./dto/quiz-search.dto";
import { PaginatedResult } from "../../helpers/pagination.helper";
import { isAdmin } from "../../helpers/admin.helper";
import { validate as validateJson } from "class-validator";
import { QuestionValidationHelper } from "../question/question-validation.helper"; // if exists
import { QuizTag } from "./quiz-tag.entity";
import { QuizQuestion } from "./quiz-question.entity";
import { QuizSource } from "./quiz-source.entity";

@Injectable()
export class QuizService {
  constructor(
    private quizRepo: QuizRepository,
    private tagRepo: TagRepository,
    private sourceRepo: SourceRepository,
  ) {}

  private mapToDto(quiz: Quiz): QuizDto {
    return {
      id: quiz.id,
      userId: quiz.userId,
      title: quiz.title,
      description: quiz.description,
      visibility: quiz.visibility,
      disabled: quiz.disabled,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      tags: quiz.quizTags?.map((qt) => qt.tag?.name) ?? [],
      questionCount: quiz.quizQuestions?.length ?? 0,
      userName: quiz.user?.username,
    };
  }

  private mapToListDto(quiz: Quiz): QuizListDto {
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      userId: quiz.userId,
      visibility: quiz.visibility,
      disabled: quiz.disabled,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      tags: quiz.quizTags?.map((qt) => qt.tag?.name) ?? [],
      questionCount: quiz.quizQuestions?.length ?? 0,
      userName: quiz.user?.username,
    };
  }

  private mapToQuestionDto(question: any): QuizQuestionDto {
    return {
      id: question.id,
      quizId: question.quizId,
      originalQuestionId: question.originalQuestionId,
      questionSnapshotJson: question.questionSnapshotJson,
      displayOrder: question.displayOrder,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }

  private validateQuestionSnapshot(snapshotJson: string): void {
    try {
      const doc = JSON.parse(snapshotJson);
      if (!doc.type || typeof doc.type !== "string") {
        throw new BadRequestException(
          'Question snapshot must contain a "type" field (string).',
        );
      }
      if (!doc.content || typeof doc.content !== "string") {
        throw new BadRequestException(
          'Question snapshot must contain a "content" field (string).',
        );
      }
      // Optionally validate using QuestionValidationHelper if available
      // QuestionValidationHelper.validateQuestionMetadata(doc.type, doc.content, doc.metadata);
    } catch (err) {
      throw new BadRequestException(
        "Invalid JSON format in question snapshot.",
      );
    }
  }

  async getQuizById(
    id: number,
    currentUserId?: number,
  ): Promise<QuizDto | null> {
    const quiz = await this.quizRepo.getById(id, true); // include disabled
    if (!quiz) return null;

    // If disabled and not owner/admin, return null
    if (
      quiz.disabled &&
      quiz.userId !== currentUserId &&
      !(currentUserId && isAdmin(currentUserId))
    ) {
      return null;
    }

    // If private and not owner
    if (quiz.visibility === "private" && quiz.userId !== currentUserId) {
      return null;
    }

    return this.mapToDto(quiz);
  }

  async getUserQuizzes(userId: number): Promise<QuizListDto[]> {
    const quizzes = await this.quizRepo.getUserQuizzes(userId);
    return quizzes.map(this.mapToListDto);
  }

  async getPublicQuizzes(visibility?: string): Promise<QuizListDto[]> {
    const quizzes = await this.quizRepo.getPublicQuizzes(visibility);
    return quizzes.map(this.mapToListDto);
  }

async createQuiz(userId: number, dto: CreateQuizDto): Promise<QuizDto> {
    const quiz = new Quiz();
    quiz.userId = userId;
    quiz.title = dto.title;
    quiz.description = dto.description ?? null;
    quiz.visibility = dto.visibility ?? "private";
    quiz.createdAt = new Date();
    quiz.updatedAt = new Date();

    if (dto.tagNames?.length) {
      const tags = await this.tagRepo.getOrCreateTags(dto.tagNames);
      quiz.quizTags = tags.map((tag) => {
        const qt = new QuizTag();
        qt.tag = tag;
        return qt;
      });
    }

    const created = await this.quizRepo.create(quiz);
    return this.mapToDto(created);
  }

  async updateQuiz(
    id: number,
    userId: number,
    dto: UpdateQuizDto,
  ): Promise<QuizDto | null> {
    const includeDisabled = isAdmin(userId);
    const quiz = await this.quizRepo.getById(id, includeDisabled);
    if (!quiz) return null;

    if (!isAdmin(userId) && quiz.userId !== userId) return null;

    if (dto.title !== undefined) quiz.title = dto.title;
    if (dto.description !== undefined) quiz.description = dto.description;
    if (dto.visibility !== undefined) quiz.visibility = dto.visibility;
    if (isAdmin(userId) && dto.disabled !== undefined)
      quiz.disabled = dto.disabled;

    if (dto.tagNames !== undefined) {
      // Remove existing tags
      await this.quizRepo.removeQuizTags(quiz.id);
      // Create new tags and associate
      const tags = await this.tagRepo.getOrCreateTags(dto.tagNames);
      quiz.quizTags = tags.map((tag) => {
        const qt = new QuizTag();
        qt.quizId = quiz.id;
        qt.tagId = tag.id;
        qt.tag = tag;
        return qt;
      });
    }

    await this.quizRepo.update(quiz);
    return this.mapToDto(quiz);
  }

  async deleteQuiz(
    id: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<boolean> {
    const quiz = await this.quizRepo.getById(id, true);
    if (!quiz) return false;
    if (!isAdmin && quiz.userId !== userId) return false;
    await this.quizRepo.hardDelete(id);
    return true;
  }

  async duplicateQuiz(id: number, userId: number): Promise<QuizDto | null> {
    const original = await this.quizRepo.getById(id);
    if (!original) return null;
    if (original.visibility !== "public" && original.userId !== userId)
      return null;

    const clone = new Quiz();
    clone.userId = userId;
    clone.title = `${original.title} (Copy)`;
    clone.description = original.description;
    clone.visibility = "private";
    clone.createdAt = new Date();
    clone.updatedAt = new Date();

    if (original.quizTags?.length) {
      clone.quizTags = original.quizTags.map((qt) => {
        const newQt = new QuizTag();
        newQt.tagId = qt.tagId;
        return newQt;
      });
    }

    if (original.quizQuestions?.length) {
      clone.quizQuestions = original.quizQuestions.map((qq) => {
        const newQq = new QuizQuestion();
        newQq.originalQuestionId = qq.originalQuestionId;
        newQq.questionSnapshotJson = qq.questionSnapshotJson;
        newQq.displayOrder = qq.displayOrder;
        return newQq;
      });
    }

    if (original.quizSources?.length) {
      clone.quizSources = original.quizSources.map((qs) => {
        const newQs = new QuizSource();
        newQs.sourceId = qs.sourceId;
        return newQs;
      });
    }

    const created = await this.quizRepo.create(clone);
    return this.mapToDto(created);
  }

  async createQuizQuestion(
    quizId: number,
    userId: number,
    dto: CreateQuizQuestionDto,
  ): Promise<QuizQuestionDto> {
    const quiz = await this.quizRepo.getById(quizId);
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (quiz.userId !== userId)
      throw new UnauthorizedException("You do not own this quiz");
    if (dto.questionSnapshotJson) {
      this.validateQuestionSnapshot(dto.questionSnapshotJson);
    }

    const question = new QuizQuestion();
    question.quizId = quizId;
    question.originalQuestionId = dto.originalQuestionId ?? null;
    question.questionSnapshotJson = dto.questionSnapshotJson ?? null;
    question.displayOrder = dto.displayOrder;

    const created = await this.quizRepo.createQuizQuestion(question);
    return this.mapToQuestionDto(created);
  }

  async updateQuizQuestion(
    id: number,
    userId: number,
    dto: UpdateQuizQuestionDto,
  ): Promise<QuizQuestionDto | null> {
    const question = await this.quizRepo.getQuizQuestionById(id);
    if (!question) return null;
    if (question.quiz.userId !== userId)
      throw new UnauthorizedException("You do not own this quiz");
    if (dto.questionSnapshotJson) {
      this.validateQuestionSnapshot(dto.questionSnapshotJson);
    }

    if (dto.originalQuestionId !== undefined)
      question.originalQuestionId = dto.originalQuestionId;
    if (dto.questionSnapshotJson !== undefined)
      question.questionSnapshotJson = dto.questionSnapshotJson;
    if (dto.displayOrder !== undefined)
      question.displayOrder = dto.displayOrder;
    question.updatedAt = new Date();

    await this.quizRepo.updateQuizQuestion(question);
    return this.mapToQuestionDto(question);
  }

  async searchQuizzes(
    search: QuizSearchDto,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<QuizListDto>> {
    const { items, totalCount } = await this.quizRepo.search(
      search.searchTerm,
      search.userId,
      search.visibility,
      search.includeDisabled,
      search.sortBy,
      search.sortOrder,
      page,
      pageSize,
    );
    return {
      items: items.map(this.mapToListDto),
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  async getQuizQuestions(
    quizId: number,
    currentUserId?: number,
  ): Promise<QuizQuestionDto[]> {
    const quiz = await this.quizRepo.getById(quizId);
    if (!quiz) return [];
    if (quiz.visibility === "private" && quiz.userId !== currentUserId)
      return [];
    const questions = await this.quizRepo.getQuestionsByQuizId(quizId);
    return questions.map(this.mapToQuestionDto);
  }

  async getQuizQuestionById(
    id: number,
    currentUserId?: number,
  ): Promise<QuizQuestionDto | null> {
    const question = await this.quizRepo.getQuizQuestionById(id);
    if (!question || !question.quiz) return null;
    if (question.quiz.disabled) return null;
    if (
      question.quiz.visibility === "private" &&
      question.quiz.userId !== currentUserId
    )
      return null;
    return this.mapToQuestionDto(question);
  }

  async deleteQuizQuestion(
    id: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<boolean> {
    const question = await this.quizRepo.getQuizQuestionById(id);
    if (!question) return false;
    if (!isAdmin && question.quiz.userId !== userId) return false;
    await this.quizRepo.deleteQuizQuestion(id);
    return true;
  }

  async getQuizNotes(
    quizId: number,
    currentUserId?: number,
  ): Promise<NoteDto[]> {
    const quiz = await this.quizRepo.getById(quizId);
    if (!quiz) return [];
    if (quiz.visibility === "private" && quiz.userId !== currentUserId)
      return [];
    const notes = await this.quizRepo.getNotesByQuizId(quizId);
    return notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));
  }

  async addNoteToQuiz(
    quizId: number,
    userId: number,
    dto: AddNoteToQuizDto,
  ): Promise<NoteDto> {
    const quiz = await this.quizRepo.getById(quizId);
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (quiz.userId !== userId)
      throw new UnauthorizedException("You do not own this quiz");

    let note;
    if (dto.noteId) {
      note = await this.quizRepo.getNoteByIdAndUser(dto.noteId, userId);
      if (!note)
        throw new BadRequestException(
          "Note not found or does not belong to you",
        );
      await this.quizRepo.addNoteToQuiz(quizId, note.id);
    } else if (dto.title && dto.content) {
      note = await this.quizRepo.createNoteAndAddToQuiz(
        quizId,
        userId,
        dto.title,
        dto.content,
      );
    } else {
      throw new BadRequestException(
        "Either provide a NoteId or both Title and Content",
      );
    }

    return {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }

  async removeNoteFromQuiz(
    quizId: number,
    noteId: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<boolean> {
    const quiz = await this.quizRepo.getById(quizId);
    if (!quiz) return false;
    if (!isAdmin && quiz.userId !== userId) return false;
    await this.quizRepo.removeNoteFromQuiz(quizId, noteId);
    return true;
  }

  async getQuizSources(
    quizId: number,
    currentUserId?: number,
  ): Promise<SourceDto[]> {
    const quiz = await this.quizRepo.getById(quizId);
    if (!quiz) return [];
    if (quiz.visibility === "private" && quiz.userId !== currentUserId)
      return [];
    const sources = await this.quizRepo.getSourcesByQuizId(quizId);
    return sources.map((s) => ({
      id: s.id,
      userId: s.userId,
      type: s.type,
      title: s.title,
      url: s.url,
      rawText: s.rawText,
      filePath: s.filePath,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      metadata: s.metadataJson,
    }));
  }

  async addSourceToQuiz(
    quizId: number,
    userId: number,
    sourceId: number,
  ): Promise<SourceDto> {
    const quiz = await this.quizRepo.getById(quizId);
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (quiz.userId !== userId)
      throw new UnauthorizedException("You do not own this quiz");

    const source = await this.sourceRepo.getById(sourceId);
    if (!source || source.userId !== userId)
      throw new BadRequestException(
        "Source not found or does not belong to you",
      );

    await this.quizRepo.addSourceToQuiz(quizId, sourceId);
    return {
      id: source.id,
      userId: source.userId,
      type: source.type,
      title: source.title,
      url: source.url,
      rawText: source.rawText,
      filePath: source.filePath,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      metadata: source.metadataJson,
    };
  }

  async removeSourceFromQuiz(
    quizId: number,
    sourceId: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<boolean> {
    const quiz = await this.quizRepo.getById(quizId);
    if (!quiz) return false;
    if (!isAdmin && quiz.userId !== userId) return false;
    await this.quizRepo.removeSourceFromQuiz(quizId, sourceId);
    return true;
  }
}
