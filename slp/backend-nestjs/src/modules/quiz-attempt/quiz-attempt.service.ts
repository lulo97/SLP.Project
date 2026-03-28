import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import type { IQuizAttemptRepository } from "./quiz-attempt.repository";
import { QuizRepository } from "../quiz/quiz.repository"; // assume exists
import { QuizAttempt } from "./quiz-attempt.entity";
import { QuizAttemptAnswer } from "./quiz-attempt-answer.entity";
import { StartAttemptRequestDto } from "./dto/start-attempt-request.dto";

import { SubmitAnswerDto } from "./dto/submit-answer.dto";
import { AttemptDto, AttemptAnswerDto } from "./dto/attempt.dto";
import {
  AttemptReviewDto,
  AttemptAnswerReviewDto,
} from "./dto/attempt-review.dto";
import {
  shuffleArray,
  shuffleOptionsInSnapshot,
  evaluateAnswer,
  isFlashcard,
} from "./quiz-grading.helper";
import {
  StartAttemptResponseDto,
  AttemptQuestionDto,
} from "./dto/start-attempt-response.dto";

export interface IQuizAttemptService {
  startAttempt(
    quizId: number,
    userId: number,
    randomizeOrder?: boolean,
  ): Promise<StartAttemptResponseDto>;
  getAttempt(
    attemptId: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<AttemptDto | null>;
  submitAnswer(
    attemptId: number,
    userId: number,
    dto: SubmitAnswerDto,
  ): Promise<void>;
  submitAttempt(attemptId: number, userId: number): Promise<AttemptDto>;
  getAttemptReview(
    attemptId: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<AttemptReviewDto | null>;
  getUserAttemptsForQuiz(quizId: number, userId: number): Promise<AttemptDto[]>;
}

@Injectable()
export class QuizAttemptService implements IQuizAttemptService {
  constructor(
    @Inject("IQuizAttemptRepository")
    private readonly attemptRepo: IQuizAttemptRepository,
    @Inject("IQuizRepository") private readonly quizRepo: QuizRepository, // assume this interface exists
  ) {}

  async startAttempt(
    quizId: number,
    userId: number,
    randomizeOrder = false,
  ): Promise<StartAttemptResponseDto> {
    const quiz = await this.quizRepo.getById(quizId, true); // include disabled
    if (!quiz) throw new BadRequestException("Quiz not found");

    if (quiz.visibility === "private" && quiz.userId !== userId) {
      throw new UnauthorizedException("You cannot attempt this private quiz");
    }
    if (quiz.disabled) {
      throw new BadRequestException(
        "This quiz is disabled and cannot be attempted",
      );
    }

    let questions = [...quiz.quizQuestions]; // assume array
    if (!questions.length)
      throw new BadRequestException(
        "Cannot start attempt on a quiz with no questions.",
      );

    // Randomize order if requested
    if (randomizeOrder) {
      questions = shuffleArray(questions);
    }

    // Calculate max score (excluding flashcards)
    const maxScore = questions.filter(
      (q) => q.questionSnapshotJson && !isFlashcard(q.questionSnapshotJson),
    ).length;

    const attempt = new QuizAttempt();
    attempt.userId = userId;
    attempt.quizId = quizId;
    attempt.startTime = new Date();
    attempt.status = "in_progress";
    attempt.maxScore = maxScore;
    attempt.questionCount = questions.length;
    const savedAttempt = await this.attemptRepo.createAttempt(attempt);

    // Create answers and shuffled snapshots
    const questionDtos: AttemptQuestionDto[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const shuffledSnapshot = shuffleOptionsInSnapshot(
        q.questionSnapshotJson || "{}",
      );
      const answer = new QuizAttemptAnswer();
      answer.attemptId = savedAttempt.id;
      answer.quizQuestionId = q.id;
      answer.questionSnapshotJson = shuffledSnapshot;
      answer.answerJson = "{}";
      await this.attemptRepo.createAnswer(answer);

      questionDtos.push({
        quizQuestionId: q.id,
        displayOrder: i + 1,
        questionSnapshotJson: shuffledSnapshot,
      });
    }

    return {
      attemptId: savedAttempt.id,
      startTime: savedAttempt.startTime,
      questionCount: savedAttempt.questionCount,
      maxScore: savedAttempt.maxScore,
      questions: questionDtos,
    };
  }

  async getAttempt(
    attemptId: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<AttemptDto | null> {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt) return null;
    if (!isAdmin && attempt.userId !== userId) return null;

    // Mark as abandoned if in_progress for more than 24h
    if (
      attempt.status === "in_progress" &&
      attempt.startTime < new Date(Date.now() - 24 * 60 * 60 * 1000)
    ) {
      attempt.status = "abandoned";
      await this.attemptRepo.updateAttempt(attempt);
    }

    return this.mapToDto(attempt);
  }

  async submitAnswer(
    attemptId: number,
    userId: number,
    dto: SubmitAnswerDto,
  ): Promise<void> {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt) throw new BadRequestException("Attempt not found");
    if (attempt.userId !== userId)
      throw new UnauthorizedException("Not your attempt");
    if (attempt.status !== "in_progress")
      throw new BadRequestException(
        "Attempt is already completed or abandoned",
      );

    const answer = await this.attemptRepo.findAnswer(
      attemptId,
      dto.quizQuestionId,
    );
    if (!answer)
      throw new BadRequestException("Question not part of this attempt");

    let parsedAnswer;
    try {
      parsedAnswer = JSON.parse(dto.answerJson);
    } catch {
      throw new BadRequestException("Invalid answer JSON");
    }

    answer.answerJson = parsedAnswer;
    await this.attemptRepo.updateAnswer(answer);
  }

  async submitAttempt(attemptId: number, userId: number): Promise<AttemptDto> {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt) throw new BadRequestException("Attempt not found");
    if (attempt.userId !== userId)
      throw new UnauthorizedException("Not your attempt");
    if (attempt.status !== "in_progress")
      throw new BadRequestException("Attempt already completed or abandoned");

    const answers = await this.attemptRepo.findAnswersByAttempt(attemptId);
    let score = 0;

    for (const answer of answers) {
      if (isFlashcard(answer.questionSnapshotJson)) {
        answer.isCorrect = null;
      } else {
        const correct = evaluateAnswer(
          answer.questionSnapshotJson,
          answer.answerJson,
        );
        answer.isCorrect = correct;
        if (correct) score++;
      }
      await this.attemptRepo.updateAnswer(answer);
    }

    attempt.score = score;
    attempt.endTime = new Date();
    attempt.status = "completed";
    await this.attemptRepo.updateAttempt(attempt);

    return this.mapToDto(attempt);
  }

  async getAttemptReview(
    attemptId: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<AttemptReviewDto | null> {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt) return null;
    if (!isAdmin && attempt.userId !== userId) return null;
    if (attempt.status !== "completed") return null;

    const answers = await this.attemptRepo.findAnswersByAttempt(attemptId);
    const reviewDto = this.mapToReviewDto(attempt);
    reviewDto.answerReview = answers.map((a) => ({
      id: a.id,
      attemptId: a.attemptId,
      quizQuestionId: a.quizQuestionId,
      questionSnapshotJson: a.questionSnapshotJson,
      answerJson: a.answerJson,
      isCorrect: a.isCorrect ?? false,
    }));
    return reviewDto;
  }

  async getUserAttemptsForQuiz(
    quizId: number,
    userId: number,
  ): Promise<AttemptDto[]> {
    const attempts = await this.attemptRepo.findByQuizAndUser(quizId, userId);
    return attempts.map((a) => this.mapToDto(a));
  }

  private mapToDto(attempt: QuizAttempt): AttemptDto {
    return {
      id: attempt.id,
      userId: attempt.userId,
      quizId: attempt.quizId,
      startTime: attempt.startTime,
      endTime: attempt.endTime ?? undefined,
      score: attempt.score ?? undefined,
      maxScore: attempt.maxScore,
      questionCount: attempt.questionCount,
      status: attempt.status,
      answers: attempt.answers?.map((a) => ({
        id: a.id,
        attemptId: a.attemptId,
        quizQuestionId: a.quizQuestionId,
        questionSnapshotJson: a.questionSnapshotJson,
        answerJson: a.answerJson,
        isCorrect: a.isCorrect ?? undefined,
      })),
    };
  }

  private mapToReviewDto(attempt: QuizAttempt): AttemptReviewDto {
    return {
      ...this.mapToDto(attempt),
      quizTitle: attempt.quiz?.title ?? "",
      answerReview: [],
    };
  }
}
