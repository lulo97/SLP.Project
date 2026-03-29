// --- Inbound requests --------------------------------------------------

import { IsNumber, IsString, IsOptional } from 'class-validator';

export class ExplainRequest {
  @IsNumber()
  sourceId: number;

  @IsString()
  selectedText: string;

  @IsOptional()
  @IsString()
  context?: string;
}

export class GrammarCheckRequest {
  @IsString()
  text: string;
}

// --- Outbound responses ------------------------------------------------

export class SyncLlmResponse {
  result: string;
}

export class AsyncLlmResponse {
  jobId: string;
  status: string = 'Pending';
}

export class JobStatusResponse {
  jobId: string;
  status: string;
  result?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}