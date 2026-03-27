import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiResponse } from "@nestjs/swagger";
import { SessionGuard } from "../session/session.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { User } from "../../common/decorators/user.decorator";
import type { IQuizAttemptService } from "./quiz-attempt.service";
import { StartAttemptRequestDto } from "./dto/start-attempt-request.dto";
import { StartAttemptResponseDto } from "./dto/start-attempt-response.dto";
import { SubmitAnswerDto } from "./dto/submit-answer.dto";
import { AttemptDto } from "./dto/attempt.dto";
import { AttemptReviewDto } from "./dto/attempt-review.dto";

@ApiTags("quiz-attempts")
@Controller("api")
export class QuizAttemptController {
  constructor(
    @Inject("IQuizAttemptService")
    private readonly attemptService: IQuizAttemptService,
  ) {}

  @Post("quizzes/:quizId/attempts")
  @UseGuards(SessionGuard)
  @ApiBearerAuth("session-token")
  @ApiResponse({ status: 201, type: StartAttemptResponseDto })
  async startAttempt(
    @Param("quizId") quizId: number,
    @User() user: any,
    @Body() dto: StartAttemptRequestDto,
  ): Promise<StartAttemptResponseDto> {
    return this.attemptService.startAttempt(
      quizId,
      user.id,
      dto.randomizeOrder,
    );
  }

  @Get("attempts/:id")
  @UseGuards(SessionGuard)
  @ApiBearerAuth("session-token")
  @ApiResponse({ status: 200, type: AttemptDto })
  @ApiResponse({ status: 404, description: "Attempt not found" })
  async getAttempt(
    @Param("id") id: number,
    @User() user: any,
    @Req() req: any,
  ): Promise<AttemptDto> {
    const isAdmin = req.user?.roles?.includes("admin") ?? false;
    const attempt = await this.attemptService.getAttempt(id, user.id, isAdmin);
    if (!attempt) throw new NotFoundException("Attempt not found");
    return attempt;
  }

  @Post("attempts/:id/answers")
  @UseGuards(SessionGuard)
  @ApiBearerAuth("session-token")
  @ApiResponse({ status: 200, description: "Answer submitted" })
  async submitAnswer(
    @Param("id") id: number,
    @User() user: any,
    @Body() dto: SubmitAnswerDto,
  ): Promise<void> {
    await this.attemptService.submitAnswer(id, user.id, dto);
  }

  @Post("attempts/:id/submit")
  @UseGuards(SessionGuard)
  @ApiBearerAuth("session-token")
  @ApiResponse({ status: 200, type: AttemptDto })
  async submitAttempt(
    @Param("id") id: number,
    @User() user: any,
  ): Promise<AttemptDto> {
    return this.attemptService.submitAttempt(id, user.id);
  }

  @Get("attempts/:id/review")
  @UseGuards(SessionGuard)
  @ApiBearerAuth("session-token")
  @ApiResponse({ status: 200, type: AttemptReviewDto })
  @ApiResponse({ status: 404, description: "Review not available" })
  async getAttemptReview(
    @Param("id") id: number,
    @User() user: any,
    @Req() req: any,
  ): Promise<AttemptReviewDto> {
    const isAdmin = req.user?.roles?.includes("admin") ?? false;
    const review = await this.attemptService.getAttemptReview(
      id,
      user.id,
      isAdmin,
    );
    if (!review) throw new NotFoundException("Review not found");
    return review;
  }

  @Get("quizzes/:quizId/attempts")
  @UseGuards(SessionGuard)
  @ApiBearerAuth("session-token")
  @ApiResponse({ status: 200, type: [AttemptDto] })
  async getUserAttemptsForQuiz(
    @Param("quizId") quizId: number,
    @User() user: any,
  ): Promise<AttemptDto[]> {
    return this.attemptService.getUserAttemptsForQuiz(quizId, user.id);
  }
}
