import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminLog } from './admin-log.entity';

@Injectable()
export class AdminLogRepository {
  constructor(
    @InjectRepository(AdminLog)
    private readonly repo: Repository<AdminLog>,
  ) {}

  async log(adminId: number, action: string, targetType?: string, targetId?: number, details?: any): Promise<void> {
    const log = this.repo.create({
      adminId,
      action,
      targetType,
      targetId,
      details,
    });
    await this.repo.save(log);
  }

  async getRecent(limit: number = 100): Promise<AdminLog[]> {
    return this.repo.find({
      relations: ['admin'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}