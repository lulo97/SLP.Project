import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserSourceProgress } from './progress.entity';

@Injectable()
export class ProgressRepository {
  private repo: Repository<UserSourceProgress>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(UserSourceProgress);
  }

  async getProgress(userId: number, sourceId: number): Promise<UserSourceProgress | null> {
    return this.repo.findOne({
      where: { userId, sourceId },
    });
  }

  async upsertProgress(
    userId: number,
    sourceId: number,
    lastPosition: any,
  ): Promise<UserSourceProgress> {
    let progress = await this.getProgress(userId, sourceId);
    if (progress) {
      progress.lastPosition = lastPosition;
      progress.updatedAt = new Date();
    } else {
      progress = this.repo.create({
        userId,
        sourceId,
        lastPosition,
      });
    }
    return this.repo.save(progress);
  }
}