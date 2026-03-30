import { Controller, Get, Query, UseGuards, ForbiddenException, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import type { Request } from 'express';
import { SessionGuard } from '../session/session.guard';
import { MetricEntry } from './metric-entry.entity';
import { isAdmin } from '../../helpers/admin.helper';

@Controller('api/admin/metrics')
@UseGuards(SessionGuard) // only authenticated users, but we'll check admin manually
export class MetricsController {
  constructor(
    @InjectRepository(MetricEntry)
    private readonly metricRepo: Repository<MetricEntry>,
  ) {}

  // Helper to extract user from request (assuming session middleware attaches user)
  private getUserId(req: Request): number {
    const user = (req as any).user;
    if (!user || !user.id) throw new ForbiddenException('No user found');
    return user.id;
  }

  private checkAdmin(req: Request): void {
    const userId = this.getUserId(req);
    if (!isAdmin(userId)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  // GET /api/admin/metrics/requests?from=&to=
  @Get('requests')
  async getRequests(
    @Query('from') from: string,
    @Query('to') to: string, 
    @Req() req: Request,
  ) {
    this.checkAdmin(req);
    const { start, end } = this.getRange(from, to);
    const rows = await this.metricRepo.find({
      where: { name: 'requests', timestamp: Between(start, end) },
      order: { timestamp: 'ASC' },
    });
    return rows.map(r => ({ timestamp: r.timestamp, value: r.value }));
  }

  // GET /api/admin/metrics/errors?from=&to=
  @Get('errors')
  async getErrors(
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: Request,
  ) {
    this.checkAdmin(req);
    const { start, end } = this.getRange(from, to);
    const rows = await this.metricRepo.find({
      where: { name: 'errors', timestamp: Between(start, end) },
      order: { timestamp: 'ASC' },
    });
    return rows.map(r => ({ timestamp: r.timestamp, value: r.value }));
  }

  // GET /api/admin/metrics/latency?from=&to=
  @Get('latency')
  async getLatency(
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: Request,
  ) {
    this.checkAdmin(req);
    const { start, end } = this.getRange(from, to);
    const rows = await this.metricRepo.find({
      where: [
        { name: 'latency_avg', timestamp: Between(start, end) },
        { name: 'latency_p95', timestamp: Between(start, end) },
      ],
      order: { timestamp: 'ASC' },
    });

    // Group by timestamp
    const map = new Map<string, { timestamp: Date; avg?: number; p95?: number }>();
    for (const row of rows) {
      const key = row.timestamp.toISOString();
      if (!map.has(key)) {
        map.set(key, { timestamp: row.timestamp });
      }
      const entry = map.get(key)!;
      if (row.name === 'latency_avg') entry.avg = row.value;
      if (row.name === 'latency_p95') entry.p95 = row.value;
    }
    return Array.from(map.values());
  }

  private getRange(from?: string, to?: string): { start: Date; end: Date } {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return { start, end };
  }
}