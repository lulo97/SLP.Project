import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitingMiddleware implements NestMiddleware {
  private redis: Redis;
  private readonly maxAttempts = 10;
  private readonly windowSeconds = 60; // 1 minute

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('redis.url');
    if (!redisUrl) throw new Error("No redisUrl!");
    this.redis = new Redis(redisUrl);
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // Apply only to login endpoint
    if (req.path === '/api/auth/login' && req.method === 'POST') {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';

      // Skip rate limit for localhost
      if (ip === '127.0.0.1' || ip === '::1') {
        return next();
      }

      const key = `rate:login:${ip}`;
      const currentCount = await this.redis.get(key);
      const count = currentCount ? parseInt(currentCount, 10) : 0;

      if (count >= this.maxAttempts) {
        throw new HttpException(
          'Too many login attempts. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await this.redis.incr(key);
      await this.redis.expire(key, this.windowSeconds);
    }
    next();
  }
}