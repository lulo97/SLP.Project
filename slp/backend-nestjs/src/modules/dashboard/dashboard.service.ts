import { Injectable } from '@nestjs/common';
import type { IWordOfTheDayProvider } from './interfaces/word-of-the-day-provider.interface';
import { QuizRepository } from '../quiz/quiz.repository';
import { UserRepository } from '../user/user.repository';
import { TopQuizDto } from './dto/top-quiz.dto';
import { UserStatsDto } from './dto/user-stats.dto';
import { WordOfTheDayDto } from './dto/word-of-the-day.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly wordProvider: IWordOfTheDayProvider,
    private readonly quizRepo: QuizRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async getWordOfTheDay(): Promise<WordOfTheDayDto> {
    return this.wordProvider.getWordOfTheDayAsync();
  }

  async getTopQuizzes(limit: number): Promise<TopQuizDto[]> {
    // Use the existing method in QuizRepository (assumed to exist)
    return this.quizRepo.getTopQuizzesByAttempts(limit);
  }

  async getUserStats(userId: number): Promise<UserStatsDto> {
    return this.userRepo.getUserStats(userId);
  }
}