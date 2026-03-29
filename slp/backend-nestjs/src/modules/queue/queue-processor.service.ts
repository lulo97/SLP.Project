import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Logger,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IQueueService } from "./queue.service.interface";
import { LlmJob } from "./llm-job.interface";
import { LlmRepository } from "../llm/llm.repository";
import { LlmService } from "../llm/llm.service";
import { ExplainRequest, GrammarCheckRequest } from "../llm/llm.dto";
import { LlmLog } from "../llm/llm.entity";

const RETRY_DELAYS = [30_000, 60_000, 120_000]; // seconds in ms

@Injectable()
export class QueueProcessorService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(QueueProcessorService.name);
  private isShuttingDown = false;
  private loopPromise: Promise<void> | null = null;
  private abortController = new AbortController();

  constructor(
    @Inject(IQueueService) private queueService: IQueueService,
    private llmRepo: LlmRepository,
    private llmService: LlmService,
    private config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    if (!this.config.get<boolean>("QUEUE_ENABLED", false)) {
      this.logger.log("Queue is disabled, background processor not started");
      return;
    }

    await this.recoverStaleJobs();
    this.startProcessingLoop();
  }

  async onApplicationShutdown(signal?: string) {
    this.isShuttingDown = true;
    this.abortController.abort();
    this.logger.log(`Shutting down, signal: ${signal}`);
    if (this.loopPromise) {
      await this.loopPromise;
    }
  }

  private startProcessingLoop() {
    this.loopPromise = this.runLoop();
  }

  private async runLoop() {
    this.logger.log("Background processor started – polling queue");
    while (!this.isShuttingDown) {
      try {
        const job = await this.queueService.dequeue();
        if (!job) {
          try {
            // Make idle delay cancellable
            await this.cancellableDelay(500, this.abortController.signal);
          } catch (err) {
            if (err.message === "Delay aborted") break;
            throw err;
          }
          continue;
        }

        this.logger.log(
          `Dequeued job ${job.jobId} (type=${job.requestType}, retry=${job.retryCount})`,
        );
        await this.processJob(job);
      } catch (err) {
        this.logger.error("Error in processing loop", err);
        try {
          await this.cancellableDelay(2000, this.abortController.signal);
        } catch (err) {
          if (err.message === "Delay aborted") break;
          // else ignore
        }
      }
    }
    this.logger.log("Background processor stopped");
  }

  private async processJob(job: LlmJob) {
    const log = await this.llmRepo.getByJobIdAsync(job.jobId);
    if (!log) {
      this.logger.warn(`No DB record for job ${job.jobId}; discarding`);
      await this.queueService.acknowledge(job.jobId);
      return;
    }

    // 1. Cache check (always, regardless of LlmCache:Enabled)
    const cached = await this.llmRepo.findCachedAsync(
      job.userId,
      job.requestType,
      log.prompt,
    );
    if (cached?.response) {
      this.logger.log(`Job ${job.jobId} resolved from cache`);
      log.response = cached.response;
      log.status = "Completed";
      log.completedAt = new Date();
      await this.llmRepo.updateAsync(log);
      await this.queueService.acknowledge(job.jobId);
      return;
    }

    // 2. Mark as processing and call LLM
    log.status = "Processing";
    await this.llmRepo.updateAsync(log);

    try {
      let result: string;
      if (job.requestType === "explain") {
        const request = JSON.parse(job.requestData) as ExplainRequest;
        result = await this.llmService.processExplainAsync(job.userId, request);
      } else if (job.requestType === "grammar_check") {
        const request = JSON.parse(job.requestData) as GrammarCheckRequest;
        result = await this.llmService.processGrammarCheckAsync(
          job.userId,
          request,
        );
      } else {
        throw new Error(`Unknown requestType: ${job.requestType}`);
      }

      log.response = result;
      log.status = "Completed";
      log.completedAt = new Date();
      await this.llmRepo.updateAsync(log);
      await this.llmRepo.upsertGlobalCacheAsync(
        log.requestType,
        log.prompt,
        result,
        log.tokensUsed,
      );
      await this.queueService.acknowledge(job.jobId);
      this.logger.log(`Job ${job.jobId} completed`);
    } catch (err) {
      // Deserialization errors → permanent failure
      if (
        err instanceof SyntaxError ||
        (err instanceof Error && err.message.includes("JSON"))
      ) {
        this.logger.error(
          `Job ${job.jobId} has invalid requestData: ${err.message}`,
        );
        await this.failJobPermanently(job, log, err);
      } else {
        await this.handleFailure(job, log, err);
      }
    }
  }

  private async failJobPermanently(job: LlmJob, log: LlmLog, err: Error) {
    this.logger.error(
      `Job ${job.jobId} permanently failed due to deserialization error`,
    );
    log.status = "Failed";
    log.error = err.message;
    log.completedAt = new Date();
    await this.llmRepo.updateAsync(log);
    await this.queueService.acknowledge(job.jobId);
  }

  // Helper to wait with shutdown awareness
  private async delayWithShutdown(ms: number): Promise<void> {
    if (this.isShuttingDown) return;
    await this.delay(ms);
  }

  private async recoverStaleJobs() {
    try {
      const staleIds = await this.queueService.getProcessingJobIds();
      if (staleIds.length === 0) return;

      this.logger.warn(`Recovering ${staleIds.length} stale job(s)`);
      for (const jobId of staleIds) {
        const log = await this.llmRepo.getByJobIdAsync(jobId);
        if (log) {
          log.status = "Pending";
          await this.llmRepo.updateAsync(log);
        }
        await this.queueService.requeueStale(jobId);
        this.logger.log(`Recovered stale job ${jobId}`);
      }
    } catch (err) {
      this.logger.error("Error during stale job recovery", err);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private cancellableDelay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        reject(new Error("Delay aborted"));
      });
    });
  }

  private async handleFailure(job: LlmJob, log: LlmLog, err: Error) {
    const maxRetries = this.config.get<number>("QUEUE_MAX_RETRIES", 3);
    this.logger.warn(
      `Job ${job.jobId} failed (attempt ${job.retryCount + 1}/${maxRetries + 1}): ${err.message}`,
    );

    if (job.retryCount < maxRetries) {
      const delayIndex = Math.min(job.retryCount, RETRY_DELAYS.length - 1);
      const delayMs = RETRY_DELAYS[delayIndex];

      log.status = "Pending";
      await this.llmRepo.updateAsync(log);

      this.logger.log(
        `Will retry job ${job.jobId} in ${delayMs / 1000}s (attempt ${job.retryCount + 1})`,
      );

      // Wait with cancellation support
      try {
        await this.cancellableDelay(delayMs, this.abortController.signal);
      } catch (delayErr) {
        // Shutdown occurred during the delay – re‑enqueue the job and exit
        if (delayErr.message === "Delay aborted") {
          this.logger.log(
            `Shutdown during retry delay for job ${job.jobId}, re‑enqueuing`,
          );
          job.retryCount++;
          await this.queueService.acknowledge(job.jobId);
          await this.queueService.enqueue(job);
          return;
        }
        throw delayErr;
      }

      // If we are shutting down after the delay (rare, but possible), re‑enqueue
      if (this.isShuttingDown) {
        job.retryCount++;
        await this.queueService.acknowledge(job.jobId);
        await this.queueService.enqueue(job);
        this.logger.log(
          `Job ${job.jobId} re‑enqueued during shutdown (retry ${job.retryCount})`,
        );
        return;
      }

      job.retryCount++;
      await this.queueService.acknowledge(job.jobId);
      await this.queueService.enqueue(job);
      this.logger.log(`Job ${job.jobId} re‑enqueued (retry ${job.retryCount})`);
    } else {
      this.logger.error(
        `Job ${job.jobId} permanently failed after ${maxRetries} retries`,
      );
      log.status = "Failed";
      log.error = err.message;
      log.completedAt = new Date();
      await this.llmRepo.updateAsync(log);
      await this.queueService.acknowledge(job.jobId);
    }
  }
}
