import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminLog } from './admin-log.entity';
import { AdminLogRepository } from './admin-log.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AdminLog])],
  providers: [AdminLogRepository],
  exports: [AdminLogRepository],
})
export class AdminModule {}