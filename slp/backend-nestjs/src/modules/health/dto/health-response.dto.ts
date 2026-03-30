export class ServiceHealthDto {
  name: string;
  status: string; // "Healthy", "Degraded", "Unhealthy"
  details?: string;
  responseTimeMs: number;
}

export class HealthCheckResponse {
  timestamp: Date;
  services: ServiceHealthDto[];
}