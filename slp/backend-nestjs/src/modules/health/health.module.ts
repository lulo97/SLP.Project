import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { HealthCheckService } from './health-check.service';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({
      ttl: 10000, // 10 seconds
      max: 100,
    }),
    ConfigModule,
    SessionModule
  ],
  controllers: [HealthController],
  providers: [HealthCheckService],
  exports: [HealthCheckService],
})
export class HealthModule {}