import { Module, Global } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { RedisModule } from "@nestjs-modules/ioredis";
import { MetricsController } from "./metrics.controller";
import { RedisMetricsCollector } from "./redis-metrics-collector.service";
import { MetricsFlushService } from "./metrics-flush.service";
import { MetricEntry } from "./metric-entry.entity";
import { METRICS_COLLECTOR } from "./metrics-collector.interface";
import { SessionModule } from "../session/session.module";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([MetricEntry]),
    ScheduleModule.forRoot(),
    RedisModule.forRoot({
      type: "single", // Explicitly define the connection type
      url: process.env.REDIS_URL || "redis://localhost:6379",
    }),
    SessionModule
  ],
  controllers: [MetricsController],
  providers: [
    {
      provide: METRICS_COLLECTOR,
      useClass: RedisMetricsCollector,
    },
    MetricsFlushService,
  ],
  exports: [METRICS_COLLECTOR],
})
export class MetricsModule {}
