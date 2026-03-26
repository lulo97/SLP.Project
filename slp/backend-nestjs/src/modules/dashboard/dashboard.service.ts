import { Injectable } from '@nestjs/common';
import type { IWordOfTheDayProvider } from './providers/word-of-the-day.provider';
import { WordOfTheDayDto } from './dto/word-of-the-day.dto';
import { TopQuizDto } from './dto/top-quiz.dto';
import { UserStatsDto } from './dto/user-stats.dto';
import { QuizRepository } from '../quiz/quiz.repository';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class DashboardService {
  constructor(
    private readonly wordProvider: IWordOfTheDayProvider,
    private readonly quizRepository: QuizRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async getWordOfTheDay(): Promise<WordOfTheDayDto> {
    return this.wordProvider.getWordOfTheDay();
  }

  async getTopQuizzes(limit: number): Promise<TopQuizDto[]> {
    return this.quizRepository.getTopQuizzesByAttempts(limit);
  }

  async getUserStats(userId: number): Promise<UserStatsDto> {
    return this.userRepository.getUserStats(userId);
  }
}