import { LlmJob } from './llm-job.interface';

export abstract class IQueueService {
  abstract enqueue(job: LlmJob): Promise<void>;
  abstract dequeue(): Promise<LlmJob | null>;
  abstract acknowledge(jobId: string): Promise<void>;
  abstract getProcessingJobIds(): Promise<string[]>;
  abstract requeueStale(jobId: string): Promise<void>;
  abstract isAvailable: boolean;
}