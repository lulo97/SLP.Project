import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { SessionGuard } from '../session/session.guard';
import { UserStatsDto } from './dto/user-stats.dto';
import { TopQuizDto } from './dto/top-quiz.dto';
import { WordOfTheDayDto } from './dto/word-of-the-day.dto';

@Controller('api/dashboard')
@UseGuards(SessionGuard) // All dashboard endpoints require auth
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('word-of-the-day')
  async getWordOfTheDay(): Promise<WordOfTheDayDto> {
    return this.dashboardService.getWordOfTheDay();
  }

  @Get('top-quizzes')
  async getTopQuizzes(@Query('limit') limit = 5): Promise<TopQuizDto[]> {
    const parsedLimit = Math.min(20, Math.max(1, Number(limit) || 5));
    return this.dashboardService.getTopQuizzes(parsedLimit);
  }

  @Get('user-stats')
  async getUserStats(@Request() req): Promise<UserStatsDto> {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');
    return this.dashboardService.getUserStats(userId);
  }
}