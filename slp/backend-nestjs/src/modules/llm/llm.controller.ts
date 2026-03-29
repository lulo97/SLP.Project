import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  HttpStatus,
  Res,
  forwardRef,
  Inject,
} from "@nestjs/common";
import type { Response } from "express";
import { v4 as uuidv4 } from "uuid";
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

  @Post("explain")
  async explain(
    @Body() request: ExplainRequest,
    @User() user: any,
    @Res() res: Response,
  ) {
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
        return res.json({ result: cached.response } as SyncLlmResponse);
      }
    }

    // Queue enabled?
    if (this.config.get<boolean>("QUEUE_ENABLED", false)) {
      return this.enqueueJob(res, userId, "explain", prompt, request);
    }

    // Synchronous fallback
    return this.processSync(res, userId, "explain", prompt);
  }

  @Post("grammar-check")
  async grammarCheck(
    @Body() request: GrammarCheckRequest,
    @User() user: any,
    @Res() res: Response,
  ) {
    const userId = user?.id ?? null;
    const prompt = this.llmService.buildGrammarCheckPrompt(request);

    if (this.config.get<boolean>("LLM_CACHE_ENABLED", true)) {
      const cached = await this.llmRepo.findCachedAsync(
        userId,
        "grammar_check",
        prompt,
      );
      if (cached?.response) {
        return res.json({ result: cached.response } as SyncLlmResponse);
      }
    }

    if (this.config.get<boolean>("QUEUE_ENABLED", false)) {
      return this.enqueueJob(res, userId, "grammar_check", prompt, request);
    }

    return this.processSync(res, userId, "grammar_check", prompt);
  }

  @Get("job/:jobId")
  async getJobStatus(
    @Param("jobId") jobId: string,
    @User() user: any,
    @Res() res: Response,
  ) {
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
    return res.json(response);
  }

  // --- Helpers --------------------------------------------------------------

  private async processSync(
    res: Response,
    userId: number | null,
    requestType: string,
    prompt: string,
  ): Promise<void> {
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

      res.status(HttpStatus.OK).json({ result: content });
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

      res
        .status(HttpStatus.BAD_GATEWAY)
        .json({
          message: "LLM service is unavailable. Please try again later.",
        });
    }
  }

  private async enqueueJob(
    res: Response,
    userId: number | null,
    requestType: string,
    prompt: string,
    requestObj: any,
  ): Promise<void> {
    const jobId = uuidv4();

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

    res.status(HttpStatus.ACCEPTED).json({ jobId, status: "Pending" });
  }
}
