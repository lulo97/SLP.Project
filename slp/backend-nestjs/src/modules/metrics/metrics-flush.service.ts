import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { MetricEntry } from './metric-entry.entity';

@Injectable()
export class MetricsFlushService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MetricsFlushService.name);
  private redis: Redis;
  private interval: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    @InjectRepository(MetricEntry)
    private metricRepo: Repository<MetricEntry>,
  ) {
    const redisUrl = this.configService.get<string>('redis.url');
    if (!redisUrl) throw new Error("No redisUrl!");
    this.redis = new Redis(redisUrl);
  }

  async onApplicationBootstrap() {
    this.logger.log('MetricsFlushService started');
    this.interval = setInterval(() => this.flush(), 60_000);
  }

  async flush(): Promise<void> {
    try {
      const now = new Date();
      const activeBucket = now.toISOString().slice(0, 16);
      const entries: MetricEntry[] = [];

      // Requests
      const requestKeys = await this.redis.keys('metric:requests:*');
      for (const key of requestKeys) {
        const bucket = key.replace('metric:requests:', '');
        if (bucket === activeBucket) continue;
        const count = await this.redis.get(key);
        if (count) {
          entries.push(this.makeEntry('requests', bucket, parseInt(count, 10)));
        }
        await this.redis.del(key);
      }

      // Errors
      const errorKeys = await this.redis.keys('metric:errors:*');
      for (const key of errorKeys) {
        const bucket = key.replace('metric:errors:', '');
        if (bucket === activeBucket) continue;
        const count = await this.redis.get(key);
        if (count) {
          entries.push(this.makeEntry('errors', bucket, parseInt(count, 10)));
        }
        await this.redis.del(key);
      }

      // Latency
      const latencyKeys = await this.redis.keys('metric:latency:*');
      for (const key of latencyKeys) {
        const bucket = key.replace('metric:latency:', '');
        if (bucket === activeBucket) continue;
        const values = await this.redis.lrange(key, 0, -1);
        const nums = values.map(v => parseFloat(v)).filter(v => !isNaN(v)).sort((a,b)=>a-b);
        if (nums.length > 0) {
          const ts = this.parseBucket(bucket);
          const p95Index = Math.ceil(0.95 * nums.length) - 1;
          entries.push(this.makeEntry('latency_avg', bucket, nums.reduce((a,b)=>a+b,0)/nums.length));
          entries.push(this.makeEntry('latency_p95', bucket, nums[p95Index]));
        }
        await this.redis.del(key);
      }

      if (entries.length > 0) {
        await this.metricRepo.save(entries);
        this.logger.log(`Flushed ${entries.length} metric entries to PostgreSQL`);
      }
    } catch (err) {
      this.logger.error(`Flush error: ${err.message}`, err.stack);
    }
  }

  private makeEntry(name: string, bucket: string, value: number): MetricEntry {
    const entry = new MetricEntry();
    entry.name = name;
    entry.timestamp = this.parseBucket(bucket);
    entry.value = value;
    return entry;
  }

  private parseBucket(bucket: string): Date {
    return new Date(bucket + ':00Z');
  }
}