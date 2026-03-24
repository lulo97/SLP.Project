import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricEntry } from './metric-entry.entity';
import { RedisMetricsCollector } from './redis-metrics-collector';
import { MetricsFlushService } from './metrics-flush.service';
import { MetricsController } from './metrics.controller';

export const METRICS_COLLECTOR = 'METRICS_COLLECTOR';

@Module({
  providers: [
    {
      provide: METRICS_COLLECTOR,
      useClass: RedisMetricsCollector,
    },
  ],
  exports: [METRICS_COLLECTOR],
})
export class MetricsModule {}