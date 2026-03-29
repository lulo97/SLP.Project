import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThanOrEqual, IsNull } from "typeorm";
import { LlmLog } from "./llm.entity";

@Injectable()
export class LlmRepository {
  constructor(
    @InjectRepository(LlmLog)
    private repo: Repository<LlmLog>,
  ) {}

  /**
   * Find a cached completed log for the given prompt.
   * Lookup order:
   *   1. User-specific row (user_id = userId, status = Completed)
   *   2. Global cache row   (user_id IS NULL,  status = Completed)
   * Returns null when no cache hit exists.
   */
  async findCachedAsync(
    userId: number | null,
    requestType: string,
    prompt: string,
  ): Promise<LlmLog | null> {
    // 1. User-specific cache
    if (userId != null) {
      const userHit = await this.repo.findOne({
        where: {
          userId,
          requestType,
          prompt,
          status: "Completed",
          response: MoreThanOrEqual(""), // not null
        },
        order: { createdAt: "DESC" },
      });
      if (userHit) return userHit;
    }

    // 2. Global cache
    return this.repo.findOne({
      where: {
        userId: IsNull(),
        requestType,
        prompt,
        status: "Completed",
        response: MoreThanOrEqual(""),
      },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Insert or update the global cache row (user_id IS NULL) for this
   * (requestType, prompt) pair.
   */
  async upsertGlobalCacheAsync(
    requestType: string,
    prompt: string,
    response: string,
    tokensUsed: number | null,
  ): Promise<void> {
    try {
      const existing = await this.repo.findOne({
        where: {
          userId: IsNull(),
          requestType,
          prompt,
          status: "Completed",
        },
      });

      if (existing) {
        existing.response = response;
        existing.tokensUsed = tokensUsed;
        existing.completedAt = new Date();
        await this.repo.save(existing);
      } else {
        const newRow = this.repo.create({
          userId: null,
          requestType,
          prompt,
          response,
          tokensUsed,
          status: "Completed",
          completedAt: new Date(),
        });
        await this.repo.save(newRow);
      }
    } catch (err) {
      // Non-fatal: a concurrent request may have inserted the same row just before us.
      // Swallow and move on.
    }
  }

  async createAsync(log: Partial<LlmLog>): Promise<LlmLog> {
    const entity = this.repo.create(log);
    return this.repo.save(entity);
  }

  async updateAsync(log: LlmLog): Promise<void> {
    await this.repo.save(log);
  }

  async getByJobIdAsync(jobId: string): Promise<LlmLog | null> {
    return this.repo.findOne({ where: { jobId } });
  }

  async getStaleProcessingLogsAsync(): Promise<LlmLog[]> {
    return this.repo.find({ where: { status: "Processing" } });
  }
}
