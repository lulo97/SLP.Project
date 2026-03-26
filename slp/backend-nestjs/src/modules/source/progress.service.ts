import { Injectable } from '@nestjs/common';
import { ProgressDto, UpdateProgressRequest } from './source.dto';

@Injectable()
export class ProgressService {
  private progressStore = new Map<string, ProgressDto>(); // key: `${userId}:${sourceId}`

  async getProgress(userId: number, sourceId: number): Promise<ProgressDto> {
    const key = `${userId}:${sourceId}`;
    const existing = this.progressStore.get(key);
    if (existing) return existing;
    return { sourceId, progress: 0, updatedAt: new Date() };
  }

  async updateProgress(
    userId: number,
    sourceId: number,
    request: UpdateProgressRequest,
  ): Promise<ProgressDto> {
    const key = `${userId}:${sourceId}`;
    const updated: ProgressDto = {
      sourceId,
      progress: request.progress,
      updatedAt: new Date(),
    };
    this.progressStore.set(key, updated);
    return updated;
  }
}