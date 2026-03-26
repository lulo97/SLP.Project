import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Source } from './source.entity';
import { SourceRepository } from './source.repository';
import { SourceService } from './source.service';
import { SourceController } from './source.controller';
import { ParserClient } from './parser-client.service';
import { ProgressService } from './progress.service';
import { UserModule } from '../user/user.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Source]),
    HttpModule,
    ConfigModule,
    UserModule,SessionModule
  ],
  providers: [
    SourceRepository,
    SourceService,
    ParserClient,
    ProgressService,
  ],
  controllers: [SourceController],
  exports: [SourceService, SourceRepository],
})
export class SourceModule {}