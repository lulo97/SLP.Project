export class MetricPointDto {
  timestamp: Date;
  value: number;
}

export class LatencyPointDto {
  timestamp: Date;
  avg?: number;
  p95?: number;
}