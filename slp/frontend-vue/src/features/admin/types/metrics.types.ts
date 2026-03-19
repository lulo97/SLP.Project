export interface MetricPoint {
  timestamp: string;
  value: number;
}

export interface LatencyPoint {
  timestamp: string;
  avg: number | null;
  p95: number | null;
}

export interface MetricsState {
  requests: MetricPoint[];
  errors: MetricPoint[];
  latency: LatencyPoint[];
  loading: {
    requests: boolean;
    errors: boolean;
    latency: boolean;
  };
  error: string | null;
}