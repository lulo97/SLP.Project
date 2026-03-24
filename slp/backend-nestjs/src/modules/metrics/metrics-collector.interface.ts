export interface IMetricsCollector {
  recordRequest(path: string, method: string, statusCode: number, latencyMs: number): Promise<void>;
}