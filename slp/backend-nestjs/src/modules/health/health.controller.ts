import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../session/session.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { HealthCheckService } from './health-check.service';
import { HealthCheckResponse } from './dto/health-response.dto';

@Controller('api/HealthDashboard')
@UseGuards(SessionGuard, RolesGuard)
@Roles('admin')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get('services')
  async getServicesHealth(): Promise<HealthCheckResponse> {
    return this.healthCheckService.getHealthStatus();
  }
}