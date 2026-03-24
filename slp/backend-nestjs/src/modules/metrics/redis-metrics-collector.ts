import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { IMetricsCollector } from './metrics-collector.interface';

@Injectable()
export class RedisMetricsCollector implements IMetricsCollector {
  private readonly redis: Redis;
  private readonly logger = new Logger(RedisMetricsCollector.name);
  private failureCount = 0;
  private lastFailureTime = 0;
  private isOpen = false;
  private readonly failureThreshold = 5;
  private readonly cooldownMs = 60 * 1000;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('redis.url');
    if (!redisUrl) throw new Error("No redisUrl!");
    this.redis = new Redis(redisUrl);
  }

  private allowRequest(): boolean {
    if (!this.isOpen) return true;
    if (Date.now() - this.lastFailureTime > this.cooldownMs) {
      this.isOpen = false;
      this.failureCount = 0;
      this.logger.log('Metrics circuit closed (recovered).');
      return true;
    }
    return false;
  }

  private recordSuccess(): void {
    this.failureCount = 0;
    if (this.isOpen) {
      this.isOpen = false;
      this.logger.log('Metrics circuit closed after success.');
    }
  }

  private recordFailure(): void {
    if (this.isOpen) return;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.isOpen = true;
      this.logger.warn(`Metrics circuit opened after ${this.failureCount} consecutive failures.`);
    }
  }

  async recordRequest(path: string, method: string, statusCode: number, latencyMs: number): Promise<void> {
    if (!this.allowRequest()) {
      this.logger.debug('Metrics circuit is open, skipping record.');
      return;
    }

    try {
      const bucket = new Date().toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
      const requestKey = `metric:requests:${bucket}`;
      const latencyKey = `metric:latency:${bucket}`;

      const pipeline = this.redis.pipeline();
      pipeline.incr(requestKey);
      pipeline.rpush(latencyKey, latencyMs.toFixed(2));
      if (statusCode >= 400) {
        pipeline.incr(`metric:errors:${bucket}`);
      }
      await pipeline.exec();

      this.recordSuccess();
    } catch (err) {
      this.logger.warn(`Failed to push metrics to Redis: ${err.message}`);
      this.recordFailure();
    }
  }
}