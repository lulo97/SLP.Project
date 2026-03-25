import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { METRICS_COLLECTOR } from '../../modules/metrics/metrics.module';
import type { IMetricsCollector } from '../../modules/metrics/metrics-collector.interface';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(
    @Inject(METRICS_COLLECTOR) private metricsCollector: IMetricsCollector,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      const latencyMs = Date.now() - start;
      this.metricsCollector.recordRequest(
        req.path,
        req.method,
        res.statusCode,
        latencyMs,
      );
    });
    next();
  }
}