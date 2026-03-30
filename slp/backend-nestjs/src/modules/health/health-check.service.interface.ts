import { HealthCheckResponse } from './dto/health-response.dto';

export interface IHealthCheckService {
  getHealthStatus(): Promise<HealthCheckResponse>;
}