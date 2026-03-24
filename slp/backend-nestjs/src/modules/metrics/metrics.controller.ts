import { Controller, Get, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MetricEntry } from './metric-entry.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';

@Controller('api/admin/metrics')
@UseGuards(RolesGuard)
@Roles('admin')
export class MetricsController {
  constructor(
    @InjectRepository(MetricEntry)
    private metricRepo: Repository<MetricEntry>,
  ) {}

  @Get('requests')
  async getRequests(@Query('from') from?: string, @Query('to') to?: string) {
    const { start, end } = this.parseRange(from, to);
    const rows = await this.metricRepo.find({
      where: { name: 'requests', timestamp: Between(start, end) },
      order: { timestamp: 'ASC' },
      select: ['timestamp', 'value'],
    });
    return rows;
  }

  @Get('errors')
  async getErrors(@Query('from') from?: string, @Query('to') to?: string) {
    const { start, end } = this.parseRange(from, to);
    const rows = await this.metricRepo.find({
      where: { name: 'errors', timestamp: Between(start, end) },
      order: { timestamp: 'ASC' },
      select: ['timestamp', 'value'],
    });
    return rows;
  }

  @Get('latency')
  async getLatency(@Query('from') from?: string, @Query('to') to?: string) {
    const { start, end } = this.parseRange(from, to);
    const rows = await this.metricRepo.find({
      where: [
        { name: 'latency_avg', timestamp: Between(start, end) },
        { name: 'latency_p95', timestamp: Between(start, end) },
      ],
      order: { timestamp: 'ASC' },
    });

    // Group by timestamp
    const grouped = new Map<string, { timestamp: Date; avg?: number; p95?: number }>();
    for (const row of rows) {
      const key = row.timestamp.toISOString();
      if (!grouped.has(key)) {
        grouped.set(key, { timestamp: row.timestamp });
      }
      const entry = grouped.get(key)!;
      if (row.name === 'latency_avg') entry.avg = row.value;
      if (row.name === 'latency_p95') entry.p95 = row.value;
    }
    return Array.from(grouped.values());
  }

  private parseRange(from?: string, to?: string): { start: Date; end: Date } {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(end.getTime() - 24 * 3600 * 1000);
    return { start, end };
  }
}