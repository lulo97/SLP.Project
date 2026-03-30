export interface MetricPoint {
  timestamp: string;
  value: number;
}

export interface LatencyPoint {
  timestamp: string;
  avg: number | null;
  p95: number | null;
}