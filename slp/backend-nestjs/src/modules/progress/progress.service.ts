import { Injectable } from '@nestjs/common';
import { ProgressRepository } from './progress.repository';
import { SourceRepository } from '../source/source.repository';
import { ProgressDto } from './dto/progress.dto';
import { UpdateProgressRequest } from './dto/update-progress-request.dto';
import { UserSourceProgress } from './progress.entity';

@Injectable()
export class ProgressService {
  constructor(
    private readonly progressRepo: ProgressRepository,
    private readonly sourceRepo: SourceRepository,
  ) {}

  private mapToDto(entity: UserSourceProgress): ProgressDto {
    return {
      sourceId: entity.sourceId,
      lastPosition: entity.lastPosition,
      updatedAt: entity.updatedAt,
    };
  }

  async getProgress(userId: number, sourceId: number): Promise<ProgressDto> {
    const entity = await this.progressRepo.getProgress(userId, sourceId);
    if (!entity) {
      // Return a default progress with null position
      return {
        sourceId,
        lastPosition: null,
        updatedAt: new Date(),
      };
    }
    return this.mapToDto(entity);
  }

  async updateProgress(
    userId: number,
    sourceId: number,
    request: UpdateProgressRequest,
  ): Promise<ProgressDto> {
    // Verify that the source exists and belongs to the user
    const source = await this.sourceRepo.getById(sourceId);
    if (!source || source.userId !== userId) {
      throw new Error('Source not found or does not belong to user');
    }

    const updated = await this.progressRepo.upsertProgress(
      userId,
      sourceId,
      request.lastPosition,
    );
    return this.mapToDto(updated);
  }
}