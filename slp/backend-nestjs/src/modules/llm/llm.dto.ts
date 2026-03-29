// --- Inbound requests --------------------------------------------------

export class ExplainRequest {
  sourceId: number;
  selectedText: string;
  context?: string;
}

export class GrammarCheckRequest {
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