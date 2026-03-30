import { Injectable, Logger, Inject } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Redis } from "ioredis";
import { MetricEntry } from "./metric-entry.entity";
import { InjectRedis } from "@nestjs-modules/ioredis";

@Injectable()
export class MetricsFlushService {
  private readonly logger = new Logger(MetricsFlushService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis, // Change this line
    @InjectRepository(MetricEntry)
    private readonly metricRepo: Repository<MetricEntry>,
  ) {}

  @Cron("* * * * *") // every minute
  async flushMetrics() {
    try {
      await this.flush();
    } catch (error) {
      this.logger.error(`Flush failed: ${error.message}`, error.stack);
    }
  }

  private async flush(): Promise<void> {
    const activeBucket = this.getCurrentBucket();

    const entries: MetricEntry[] = [];

    // ---- Requests ----
    await this.processCounters("requests", activeBucket, entries);
    // ---- Errors ----
    await this.processCounters("errors", activeBucket, entries);
    // ---- Latency ----
    await this.processLatency(activeBucket, entries);

    if (entries.length === 0) return;

    await this.metricRepo.save(entries);
    this.logger.log(`Flushed ${entries.length} metric entries to PostgreSQL`);
  }

  private async processCounters(
    name: string,
    activeBucket: string,
    entries: MetricEntry[],
  ) {
    const pattern = `metric:${name}:*`;
    let cursor = "0";
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;

      for (const key of keys) {
        const bucket = key.split(":")[2];
        if (bucket === activeBucket) continue;

        const value = await this.redis.get(key);
        if (value !== null) {
          const count = parseInt(value, 10);
          const entry = this.makeEntry(name, bucket, count);
          if (entry) entries.push(entry);
        }
        await this.redis.del(key);
      }
    } while (cursor !== "0");
  }

  private async processLatency(activeBucket: string, entries: MetricEntry[]) {
    const pattern = "metric:latency:*";
    let cursor = "0";
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;

      for (const key of keys) {
        const bucket = key.split(":")[2];
        if (bucket === activeBucket) continue;
        
        // Skip if bucket is invalid
        if (!this.parseBucket(bucket)) {
          await this.redis.del(key);
          continue;
        }

        const values = await this.redis.lrange(key, 0, -1);
        if (values.length === 0) {
          await this.redis.del(key);
          continue;
        }

        const numbers = values
          .map((v) => parseFloat(v))
          .filter((v) => !isNaN(v));
        if (numbers.length > 0) {
          numbers.sort((a, b) => a - b);
          const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
          const p95Index = Math.ceil(0.95 * numbers.length) - 1;
          const p95 = numbers[p95Index] || numbers[numbers.length - 1];

          const ts = this.parseBucket(bucket);
          const avgEntry = this.makeEntry("latency_avg", bucket, avg);
          const p95Entry = this.makeEntry("latency_p95", bucket, p95);
          if (avgEntry) entries.push(avgEntry);
          if (p95Entry) entries.push(p95Entry);
        }

        await this.redis.del(key);
      }
    } while (cursor !== "0");
  }

  private makeEntry(
    name: string,
    bucket: string,
    value: number,
  ): MetricEntry | null {
    const timestamp = this.parseBucket(bucket);
    if (!timestamp) return null;
    const entry = new MetricEntry();
    entry.name = name;
    entry.timestamp = timestamp;
    entry.value = value;
    entry.tags = null;
    return entry;
  }

  private parseBucket(bucket: string): Date | null {
    // Expected format: YYYY-MM-DDTHH:MM
    const match = bucket.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!match) {
      this.logger.warn(`Skipping invalid bucket format: ${bucket}`);
      return null;
    }
    const [, year, month, day, hour, minute] = match.map(Number);
    return new Date(Date.UTC(year, month - 1, day, hour, minute));
  }

  private getCurrentBucket(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    const hour = String(now.getUTCHours()).padStart(2, "0");
    const minute = String(now.getUTCMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }
}
