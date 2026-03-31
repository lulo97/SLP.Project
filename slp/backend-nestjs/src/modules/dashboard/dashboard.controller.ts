import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { SessionGuard } from '../session/session.guard';
import { DashboardService } from './dashboard.service';
import { TopQuizDto } from './dto/top-quiz.dto';
import { UserStatsDto } from './dto/user-stats.dto';
import { WordOfTheDayDto } from './dto/word-of-the-day.dto';

@Controller('api/dashboard')
@UseGuards(SessionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('word-of-the-day')
  async getWordOfTheDay(): Promise<WordOfTheDayDto> {
    return this.dashboardService.getWordOfTheDay();
  }

  @Get('top-quizzes')
  async getTopQuizzes(@Query('limit') limitStr?: string): Promise<TopQuizDto[]> {
    let limit = limitStr ? parseInt(limitStr, 10) : 5;
    if (isNaN(limit) || limit < 1) limit = 5;
    if (limit > 20) limit = 20;
    return this.dashboardService.getTopQuizzes(limit);
  }

  @Get('user-stats')
  async getUserStats(@Request() req): Promise<UserStatsDto> {
    const userId = req.user.id;
    return this.dashboardService.getUserStats(userId);
  }
}