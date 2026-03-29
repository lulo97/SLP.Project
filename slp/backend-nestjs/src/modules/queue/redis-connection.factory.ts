import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisConnectionFactory {
  private readonly logger = new Logger(RedisConnectionFactory.name);
  private readonly redis: Redis | null;

  constructor() {
    const connectionString = process.env.REDIS_URL;
    if (!connectionString) {
      this.logger.warn('Redis connection string is missing.');
      this.redis = null;
      return;
    }

    try {
      this.redis = new Redis(connectionString);
      this.logger.log('Redis connected');
    } catch (err) {
      this.logger.warn('Failed to connect to Redis', err);
      this.redis = null;
    }
  }

  getConnection(): Redis | null {
    return this.redis;
  }
}