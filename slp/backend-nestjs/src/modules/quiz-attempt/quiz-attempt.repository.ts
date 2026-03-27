import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizAttemptAnswer } from './quiz-attempt-answer.entity';

export interface IQuizAttemptRepository {
  findById(id: number): Promise<QuizAttempt | null>;
  findByQuizAndUser(quizId: number, userId: number): Promise<QuizAttempt[]>;
  createAttempt(attempt: Partial<QuizAttempt>): Promise<QuizAttempt>;
  updateAttempt(attempt: QuizAttempt): Promise<QuizAttempt>;
  findAnswer(attemptId: number, quizQuestionId: number): Promise<QuizAttemptAnswer | null>;
  findAnswersByAttempt(attemptId: number): Promise<QuizAttemptAnswer[]>;
  createAnswer(answer: Partial<QuizAttemptAnswer>): Promise<QuizAttemptAnswer>;
  updateAnswer(answer: QuizAttemptAnswer): Promise<QuizAttemptAnswer>;
}

@Injectable()
export class QuizAttemptRepository implements IQuizAttemptRepository {
  constructor(
    @InjectRepository(QuizAttempt)
    private readonly attemptRepo: Repository<QuizAttempt>,
    @InjectRepository(QuizAttemptAnswer)
    private readonly answerRepo: Repository<QuizAttemptAnswer>,
  ) {}

  async findById(id: number): Promise<QuizAttempt | null> {
    return this.attemptRepo.findOne({
      where: { id },
      relations: ['answers', 'quiz'],
    });
  }

  async findByQuizAndUser(quizId: number, userId: number): Promise<QuizAttempt[]> {
    return this.attemptRepo.find({
      where: { quizId, userId },
      order: { startTime: 'DESC' },
    });
  }

  async createAttempt(attempt: Partial<QuizAttempt>): Promise<QuizAttempt> {
    const entity = this.attemptRepo.create(attempt);
    return this.attemptRepo.save(entity);
  }

  async updateAttempt(attempt: QuizAttempt): Promise<QuizAttempt> {
    return this.attemptRepo.save(attempt);
  }

  async findAnswer(attemptId: number, quizQuestionId: number): Promise<QuizAttemptAnswer | null> {
    return this.answerRepo.findOne({
      where: { attemptId, quizQuestionId },
    });
  }

  async findAnswersByAttempt(attemptId: number): Promise<QuizAttemptAnswer[]> {
    return this.answerRepo.find({
      where: { attemptId },
    });
  }

  async createAnswer(answer: Partial<QuizAttemptAnswer>): Promise<QuizAttemptAnswer> {
    const entity = this.answerRepo.create(answer);
    return this.answerRepo.save(entity);
  }

  async updateAnswer(answer: QuizAttemptAnswer): Promise<QuizAttemptAnswer> {
    return this.answerRepo.save(answer);
  }
}