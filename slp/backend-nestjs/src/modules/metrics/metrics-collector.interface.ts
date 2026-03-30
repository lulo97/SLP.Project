export const METRICS_COLLECTOR = 'METRICS_COLLECTOR';

export interface IMetricsCollector {
  recordRequest(path: string, method: string, statusCode: number, latencyMs: number): Promise<void>;
}