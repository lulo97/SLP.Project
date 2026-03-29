import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { SessionGuard } from '../session/session.guard';
import { User } from '../../common/decorators/user.decorator';
import { ProgressService } from './progress.service';
import { UpdateProgressRequest } from './dto/update-progress-request.dto';
import { ProgressDto } from './dto/progress.dto';

@Controller('api')
@UseGuards(SessionGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('source/:sourceId/progress')
  async getProgress(
    @Param('sourceId') sourceId: string,
    @User() user: any,
  ): Promise<ProgressDto> {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException();

    const progress = await this.progressService.getProgress(
      parseInt(sourceId),
      userId,
    );
    return progress;
  }

  @Put('source/:sourceId/progress')
  async updateProgress(
    @Param('sourceId') sourceId: string,
    @Body() request: UpdateProgressRequest,
    @User() user: any,
  ): Promise<ProgressDto> {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException();

    try {
      const updated = await this.progressService.updateProgress(
        parseInt(sourceId),
        userId,
        request,
      );
      return updated;
    } catch (error) {
      // If source not found or ownership check fails, return 404
      if (error.message.includes('not found') || error.message.includes('not belong')) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}