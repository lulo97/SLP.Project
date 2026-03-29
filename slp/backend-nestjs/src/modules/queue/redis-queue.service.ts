import { Injectable, Logger } from '@nestjs/common';
import { IQueueService } from './queue.service.interface';
import { LlmJob } from './llm-job.interface';
import { RedisConnectionFactory } from './redis-connection.factory';

@Injectable()
export class RedisQueueService implements IQueueService {
  private readonly logger = new Logger(RedisQueueService.name);
  private readonly redis;
  private readonly pendingKey = 'llm:queue:pending';
  private readonly processingKey = 'llm:queue:processing';
  private static jobDataKey(jobId: string) {
    return `llm:job:${jobId}`;
  }

  constructor(private redisFactory: RedisConnectionFactory) {
    this.redis = redisFactory.getConnection();
  }

  get isAvailable(): boolean {
    return this.redis !== null;
  }

  async enqueue(job: LlmJob): Promise<void> {
    if (!this.redis) {
      this.logUnavailable();
      return;
    }

    const json = JSON.stringify(job);
    // Store job data with 7-day TTL
    await this.redis.setex(RedisQueueService.jobDataKey(job.jobId), 604800, json);
    // Push to pending list
    await this.redis.lpush(this.pendingKey, job.jobId);
    this.logger.debug(`Enqueued job ${job.jobId}`);
  }

  async dequeue(): Promise<LlmJob | null> {
    if (!this.redis) {
      this.logUnavailable();
      return null;
    }

    // Atomically move jobId from pending → processing (RPOPLPUSH)
    const jobId = await this.redis.rpoplpush(this.pendingKey, this.processingKey);
    if (!jobId) return null;

    const jobJson = await this.redis.get(RedisQueueService.jobDataKey(jobId));
    if (!jobJson) {
      // Orphaned entry – clean up processing list
      await this.redis.lrem(this.processingKey, 0, jobId);
      this.logger.warn(`Job data missing for ${jobId}`);
      return null;
    }

    return JSON.parse(jobJson) as LlmJob;
  }

  async acknowledge(jobId: string): Promise<void> {
    if (!this.redis) {
      this.logUnavailable();
      return;
    }
    await this.redis.lrem(this.processingKey, 0, jobId);
    this.logger.debug(`Acknowledged job ${jobId}`);
  }

  async getProcessingJobIds(): Promise<string[]> {
    if (!this.redis) return [];
    const ids = await this.redis.lrange(this.processingKey, 0, -1);
    return ids;
  }

  async requeueStale(jobId: string): Promise<void> {
    if (!this.redis) return;
    await this.redis.lrem(this.processingKey, 0, jobId);
    await this.redis.lpush(this.pendingKey, jobId);
    this.logger.log(`Requeued stale job ${jobId}`);
  }

  private logUnavailable() {
    // Rate-limit logging? For simplicity, we'll log once per call.
    this.logger.warn('Redis unavailable – queue operation skipped');
  }
}