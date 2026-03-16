// src/features/llm/llmService.ts
import apiClient from '@/lib/api/client';

export interface LlmExplainRequest {
  sourceId: number;
  selectedText: string;
  context?: string;
}

export interface LlmExplainResponse {
  explanation: string;
}

export interface LlmGrammarRequest {
  text: string;
}

export interface LlmGrammarResponse {
  correctedText: string;
}

export interface LlmJobResponse {
  jobId: string;
  status: string;
}

export interface LlmJobStatusResponse {
  jobId: string;
  status: string;
  result?: string;
  createdAt?: string;
  completedAt?: string;
}

// Polling configuration
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 30; // 60 seconds max

/**
 * Call LLM explain endpoint. Handles both immediate and queued responses.
 * Returns the explanation text.
 */
export async function requestExplanation(
  request: LlmExplainRequest
): Promise<string> {
  const response = await apiClient.post<LlmExplainResponse | LlmJobResponse>(
    '/llm/explain',
    request
  );

  // If response contains explanation, return it immediately
  if ('explanation' in response.data) {
    return response.data.explanation;
  }

  // Otherwise, we have a job – start polling
  const { jobId } = response.data as LlmJobResponse;
  return pollForResult(jobId);
}

/**
 * Call LLM grammar check endpoint. Handles both immediate and queued responses.
 * Returns the corrected text.
 */
export async function requestGrammarCheck(
  request: LlmGrammarRequest
): Promise<string> {
  const response = await apiClient.post<LlmGrammarResponse | LlmJobResponse>(
    '/llm/grammar-check',
    request
  );

  if ('correctedText' in response.data) {
    return response.data.correctedText;
  }

  const { jobId } = response.data as LlmJobResponse;
  return pollForResult(jobId);
}

/**
 * Poll the job status endpoint until the job completes or fails.
 */
async function pollForResult(jobId: string): Promise<string> {
  let attempts = 0;
  while (attempts < MAX_POLL_ATTEMPTS) {
    const statusRes = await apiClient.get<LlmJobStatusResponse>(
      `/llm/job/${jobId}`
    );
    const { status, result } = statusRes.data;

    if (status === 'Completed' && result) {
      return result;
    }
    if (status === 'Failed') {
      throw new Error('LLM processing failed');
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
  throw new Error('LLM request timed out');
}