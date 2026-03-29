import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSourceProgress } from './progress.entity';
import { ProgressRepository } from './progress.repository';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { SourceModule } from '../source/source.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSourceProgress]),
    SourceModule,
    SessionModule,
  ],
  providers: [ProgressRepository, ProgressService],
  controllers: [ProgressController],
  exports: [ProgressService],
})
export class ProgressModule {}