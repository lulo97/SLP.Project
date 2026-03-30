import { Injectable, Logger, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { IMetricsCollector } from './metrics-collector.interface';
import { InjectRedis } from '@nestjs-modules/ioredis';

class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: Date | null = null;
  private isOpen = false;
  private readonly threshold: number;
  private readonly cooldownMs: number;

  constructor(threshold: number, cooldownMs: number) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }

  allowRequest(): boolean {
    if (!this.isOpen) return true;

    if (this.lastFailureTime && Date.now() - this.lastFailureTime.getTime() > this.cooldownMs) {
      this.isOpen = false;
      this.failureCount = 0;
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    if (this.isOpen) {
      this.isOpen = false;
    }
  }

  recordFailure(): void {
    if (this.isOpen) return;

    this.failureCount++;
    this.lastFailureTime = new Date();
    if (this.failureCount >= this.threshold) {
      this.isOpen = true;
    }
  }
}

@Injectable()
export class RedisMetricsCollector implements IMetricsCollector {
  private readonly logger = new Logger(RedisMetricsCollector.name);
  private readonly circuitBreaker: CircuitBreaker;

  constructor(@InjectRedis() private readonly redis: Redis) {
    this.circuitBreaker = new CircuitBreaker(5, 60000);
  }

  async recordRequest(path: string, method: string, statusCode: number, latencyMs: number): Promise<void> {
    if (!this.circuitBreaker.allowRequest()) {
      this.logger.debug('Metrics circuit open, skipping record');
      return;
    }

    try {
      const bucket = this.getCurrentBucket();
      const requestKey = `metric:requests:${bucket}`;
      const latencyKey = `metric:latency:${bucket}`;

      const pipeline = this.redis.pipeline();
      pipeline.incr(requestKey);
      pipeline.rpush(latencyKey, latencyMs.toFixed(2));

      if (statusCode >= 400) {
        const errorKey = `metric:errors:${bucket}`;
        pipeline.incr(errorKey);
      }

      await pipeline.exec();
      this.circuitBreaker.recordSuccess();
    } catch (error) {
      this.logger.warn(`Failed to push metrics to Redis: ${error.message}`);
      this.circuitBreaker.recordFailure();
    }
  }

  private getCurrentBucket(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours()).padStart(2, '0');
    const minute = String(now.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }
}