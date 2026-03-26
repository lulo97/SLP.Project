import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { QuizService } from "./quiz.service";
import { SessionGuard } from "../session/session.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CreateQuizDto } from "./dto/create-quiz.dto";
import { UpdateQuizDto } from "./dto/update-quiz.dto";
import {
  CreateQuizQuestionDto,
  UpdateQuizQuestionDto,
} from "./dto/quiz-question.dto";
import { AddNoteToQuizDto } from "./dto/add-note-to-quiz.dto";
import { AddSourceToQuizDto } from "./dto/add-source-to-quiz.dto";
import { QuizSearchDto } from "./dto/quiz-search.dto";
import type { Request as ExpressRequest } from 'express';

@Controller("api/quiz")
export class QuizController {
  constructor(private quizService: QuizService) {}

  private getCurrentUser(req: any): { id: number; isAdmin: boolean } | null {
    if (!req.user) return null;
    return {
      id: req.user.id,
      isAdmin: req.user.role === "admin",
    };
  }

  @Get()
  async getQuizzes(
    @Request() req: ExpressRequest,
    @Query("search") search?: string,
    @Query("visibility") visibility?: string,
    @Query("mine") mine?: boolean,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: "asc" | "desc",
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    // Normalize pagination
    page = Math.max(1, page);
    pageSize = Math.min(50, Math.max(1, pageSize));

    let userId: number | undefined;
    let includeDisabled = false;
    let effectiveVisibility: string | undefined = visibility;

    const currentUser = this.getCurrentUser(req);

    if (mine === true) {
      if (!currentUser) throw new ForbiddenException("Authentication required");
      userId = currentUser.id;
      includeDisabled = true; // owner sees their disabled quizzes
      effectiveVisibility = undefined; // owner sees all visibilities
    } else {
      // Public listing: default to public, exclude disabled
      if (!effectiveVisibility) effectiveVisibility = "public";
      // includeDisabled stays false
    }

    const searchDto: QuizSearchDto = {
      searchTerm: search,
      userId,
      visibility: effectiveVisibility,
      includeDisabled,
      sortBy,
      sortOrder,
    };

    const results = await this.quizService.searchQuizzes(
      searchDto,
      page,
      pageSize,
    );
    return results;
  }

  @Get(":id")
  async getQuiz(@Param("id") id: number, @Request() req) {
    const currentUser = this.getCurrentUser(req);
    const quiz = await this.quizService.getQuizById(id, currentUser?.id);
    if (!quiz) throw new NotFoundException();
    return quiz;
  }

  @Post()
  @UseGuards(SessionGuard)
  async createQuiz(@Body() dto: CreateQuizDto, @Request() req) {
    const user = this.getCurrentUser(req);
    if (!user) throw new ForbiddenException();
    const quiz = await this.quizService.createQuiz(user.id, dto);
    return quiz;
  }

  @Put(":id")
  @UseGuards(SessionGuard)
  async updateQuiz(
    @Param("id") id: number,
    @Body() dto: UpdateQuizDto,
    @Request() req,
  ) {
    const user = this.getCurrentUser(req);
    if (!user) throw new ForbiddenException();
    const updated = await this.quizService.updateQuiz(id, user.id, dto);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(":id")
  @UseGuards(SessionGuard)
  async deleteQuiz(@Param("id") id: number, @Request() req) {
    const user = this.getCurrentUser(req);
    if (!user) throw new ForbiddenException();
    const deleted = await this.quizService.deleteQuiz(
      id,
      user.id,
      user.isAdmin,
    );
    if (!deleted) throw new NotFoundException();
    return { message: "Quiz deleted successfully" };
  }

  @Post(":id/duplicate")
  @UseGuards(SessionGuard)
  async duplicateQuiz(@Param("id") id: number, @Request() req) {
    const user = this.getCurrentUser(req);
    if (!user) throw new ForbiddenException();
    const duplicated = await this.quizService.duplicateQuiz(id, user.id);
    if (!duplicated) throw new NotFoundException();
    return duplicated;
  }

  // Questions
  @Get(":quizId/questions")
  async getQuizQuestions(@Param("quizId") quizId: number, @Request() req) {
    const currentUser = this.getCurrentUser(req);
    const questions = await this.quizService.getQuizQuestions(
      quizId,
      currentUser?.id,
    );
    return questions;
  }

  @Get("questions/:id")
  async getQuizQuestion(@Param("id") id: number, @Request() req) {
    const currentUser = this.getCurrentUser(req);
    const question = await this.quizService.getQuizQuestionById(
      id,
      currentUser?.id,
    );
    if (!question) throw new NotFoundException();
    return question;
  }

  @Post(":quizId/questions")
  @UseGuards(SessionGuard)
  async createQuizQuestion(
    @Param("quizId") quizId: number,
    @Body() dto: CreateQuizQuestionDto,
    @Request() req,
  ) {
    const user = this.getCurrentUser(req);
    if (!user) throw new ForbiddenException();
    try {
      const question = await this.quizService.createQuizQuestion(
        quizId,
        user.id,
        dto,
      );
      return question;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(err.message);
    }
  }

  @Put("questions/:id")
  @UseGuards(SessionGuard)
  async updateQuizQuestion(
    @Param("id") id: number,
    @Body() dto: UpdateQuizQuestionDto,
    @Request() req,
  ) {
    const user = this.getCurrentUser(req);
    if (!user) throw new ForbiddenException();
    try {
      const updated = await this.quizService.updateQuizQuestion(
        id,
        user.id,
        dto,
      );
      if (!updated) throw new NotFoundException();
      return updated;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(err.message);
    }
  }

  @Delete("questions/:id")
  @UseGuards(SessionGuard)
  async deleteQuizQuestion(@Param("id") id: number, @Request() req) {
    const user = this.getCurrentUser(req);
    if (!user) throw new ForbiddenException();
    const deleted = await this.quizService.deleteQuizQuestion(
      id,
      user.id,
      user.isAdmin,
    );
    if (!deleted) throw new NotFoundException();
    return { message: "Question deleted successfully" };
  }

  // Notes
  @Get(":quizId/notes")
  async getQuizNotes(@Param("quizId") quizId: number, @Request() req) {
    const currentUser = this.getCurrentUser(req);
    const notes = await this.quizService.getQuizNotes(quizId, currentUser?.id);
    return notes;
  }

  @Post(":quizId/notes")
  @UseGuards(SessionGuard)
  async addNoteToQuiz(
    @Param("quizId") quizId: number,
    @Body() dto: AddNoteToQuizDto,
    @Request() req,
  ) {
    const user = this.getCurrentUser(req);
    if (!user) throw new ForbiddenException();
    try {
      const note = await this.quizService.addNoteToQuiz(quizId, user.id, dto);
      return note;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(err.message);
    }
  }

  @Delete(":quizId/notes/:noteId")
  @UseGuards(SessionGuard)
  async removeNoteFromQuiz(
    @Param("quizId") quizId: number,
    @Param("noteId") noteId: number,
    @Request() req,
  ) {
    const user = this.getCurrentUser(req);
    if (!user) throw new ForbiddenException();
    const removed = await this.quizService.removeNoteFromQuiz(
      quizId,
      noteId,
      user.id,
      user.isAdmin,
    );
    if (!removed) throw new NotFoundException();
    return { message: "Note removed from quiz" };
  }

  // Sources
  @Get(":quizId/sources")
  async getQuizSources(@Param("quizId") quizId: number, @Request() req) {
    const currentUser = this.getCurrentUser(req);
    const sources = await this.quizService.getQuizSources(
      quizId,
      currentUser?.id,
    );
    return sources;
  }

  @Post(":quizId/sources")
  @UseGuards(SessionGuard)
  async addSourceToQuiz(
    @Param("quizId") quizId: number,
    @Body() dto: AddSourceToQuizDto,
    @Request() req,
  ) {
    const user = this.getCurrentUser(req);
    if (!user) throw new ForbiddenException();
    try {
      const source = await this.quizService.addSourceToQuiz(
        quizId,
        user.id,
        dto.sourceId,
      );
      return source;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(err.message);
    }
  }

  @Delete(":quizId/sources/:sourceId")
  @UseGuards(SessionGuard)
  async removeSourceFromQuiz(
    @Param("quizId") quizId: number,
    @Param("sourceId") sourceId: number,
    @Request() req,
  ) {
    const user = this.getCurrentUser(req);
    if (!user) throw new ForbiddenException();
    const removed = await this.quizService.removeSourceFromQuiz(
      quizId,
      sourceId,
      user.id,
      user.isAdmin,
    );
    if (!removed) throw new NotFoundException();
    return { message: "Source removed from quiz" };
  }
}
