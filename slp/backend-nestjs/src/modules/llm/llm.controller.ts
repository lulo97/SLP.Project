import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Res,
  forwardRef,
  Inject,
} from "@nestjs/common";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { SessionGuard } from "../session/session.guard";
import { User } from "../../common/decorators/user.decorator";
import { LlmService } from "./llm.service";
import { LlmRepository } from "./llm.repository";
import { IQueueService } from "../queue/queue.service.interface";
import {
  ExplainRequest,
  GrammarCheckRequest,
  SyncLlmResponse,
  AsyncLlmResponse,
  JobStatusResponse,
} from "./llm.dto";
import { LlmJob } from "../queue/llm-job.interface";

@Controller("api/llm")
@UseGuards(SessionGuard)
export class LlmController {
  constructor(
    private llmService: LlmService,
    private llmRepo: LlmRepository,
    @Inject(forwardRef(() => IQueueService))
    private queueService: IQueueService,
    private config: ConfigService,
  ) {}

  // POST /api/llm/explain
  @Post("explain")
  async explain(@Body() request: ExplainRequest, @User() user: any) {
    const userId = user?.id ?? null;
    const prompt = this.llmService.buildExplainPrompt(request);

    // Cache check
    if (this.config.get<boolean>("LLM_CACHE_ENABLED", true)) {
      const cached = await this.llmRepo.findCachedAsync(
        userId,
        "explain",
        prompt,
      );
      if (cached?.response) {
        return { result: cached.response } as SyncLlmResponse;
      }
    }

    // Queue enabled?
    if (this.config.get<boolean>("QUEUE_ENABLED", false)) {
      return this.enqueueJob(userId, "explain", prompt, request);
    }

    // Synchronous fallback
    return this.processSync(userId, "explain", prompt);
  }

  // POST /api/llm/grammar-check
  @Post("grammar-check")
  async grammarCheck(@Body() request: GrammarCheckRequest, @User() user: any) {
    const userId = user?.id ?? null;
    const prompt = this.llmService.buildGrammarCheckPrompt(request);

    if (this.config.get<boolean>("LLM_CACHE_ENABLED", true)) {
      const cached = await this.llmRepo.findCachedAsync(
        userId,
        "grammar_check",
        prompt,
      );
      if (cached?.response) {
        return { result: cached.response } as SyncLlmResponse;
      }
    }

    if (this.config.get<boolean>("QUEUE_ENABLED", false)) {
      return this.enqueueJob(userId, "grammar_check", prompt, request);
    }

    return this.processSync(userId, "grammar_check", prompt);
  }

  // GET /api/llm/job/:jobId
  @Get("job/:jobId")
  async getJobStatus(@Param("jobId") jobId: string, @User() user: any) {
    const log = await this.llmRepo.getByJobIdAsync(jobId);
    if (!log) {
      throw new NotFoundException(`Job '${jobId}' not found`);
    }

    const userId = user?.id ?? null;
    if (log.userId !== userId) {
      throw new ForbiddenException();
    }

    const response: JobStatusResponse = {
      jobId: log.jobId!,
      status: log.status ?? "Unknown",
      result: log.response ?? undefined,
      error: log.error ?? undefined,
      createdAt: log.createdAt,
      completedAt: log.completedAt ?? undefined,
    };
    return response;
  }

  // --- Helpers --------------------------------------------------------------

  private async processSync(
    userId: number | null,
    requestType: string,
    prompt: string,
  ): Promise<SyncLlmResponse> {
    try {
      const { content, tokensUsed } =
        await this.llmService.callLlmAsync(prompt);

      // Persist user log
      await this.llmRepo.createAsync({
        userId,
        requestType,
        prompt,
        response: content,
        tokensUsed,
        status: "Completed",
        completedAt: new Date(),
      });

      // Update global cache
      await this.llmRepo.upsertGlobalCacheAsync(
        requestType,
        prompt,
        content,
        tokensUsed,
      );

      return { result: content };
    } catch (err) {
      // Log error
      await this.llmRepo.createAsync({
        userId,
        requestType,
        prompt,
        status: "Failed",
        error: err.message,
        completedAt: new Date(),
      });

      throw new BadRequestException(
        "LLM service is unavailable. Please try again later.",
      );
    }
  }

  private async enqueueJob(
    userId: number | null,
    requestType: string,
    prompt: string,
    requestObj: any,
  ): Promise<AsyncLlmResponse> {
    const jobId = this.generateJobId();

    // Create DB log with status = Pending
    const log = await this.llmRepo.createAsync({
      userId,
      requestType,
      prompt,
      jobId,
      status: "Pending",
    });

    const job: LlmJob = {
      jobId,
      userId,
      requestType,
      requestData: JSON.stringify(requestObj),
      createdAt: new Date(),
      retryCount: 0,
    };

    await this.queueService.enqueue(job);

    return { jobId, status: "Pending" };
  }

  private generateJobId(): string {
    // Simple UUID v4-like string
    return (
      Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
    );
  }
}
