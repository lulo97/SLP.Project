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

  async log(log: Partial<AdminLog>): Promise<void> {
    const entity = this.repo.create(log);
    await this.repo.save(entity);
  }

  async getRecent(count: number = 100): Promise<AdminLog[]> {
    return this.repo.find({
      relations: ['admin'],
      order: { createdAt: 'DESC' },
      take: count,
    });
  }
}