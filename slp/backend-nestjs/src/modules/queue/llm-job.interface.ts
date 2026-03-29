export interface LlmJob {
  jobId: string;
  userId: number | null;
  requestType: string;        // 'explain' | 'grammar_check'
  requestData: string;        // JSON string of the original request
  createdAt: Date;
  retryCount: number;
}