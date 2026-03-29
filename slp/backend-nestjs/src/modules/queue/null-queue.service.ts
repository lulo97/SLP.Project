import { Injectable } from '@nestjs/common';
import { IQueueService } from './queue.service.interface';
import { LlmJob } from './llm-job.interface';

@Injectable()
export class NullQueueService implements IQueueService {
  isAvailable = false;

  enqueue(_job: LlmJob): Promise<void> {
    throw new Error('Queue is disabled. Enable Queue:Enabled in configuration.');
  }

  dequeue(): Promise<LlmJob | null> {
    return Promise.resolve(null);
  }

  acknowledge(_jobId: string): Promise<void> {
    return Promise.resolve();
  }

  getProcessingJobIds(): Promise<string[]> {
    return Promise.resolve([]);
  }

  requeueStale(_jobId: string): Promise<void> {
    return Promise.resolve();
  }
}