import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './session.entity';
import { SessionRepository } from './session.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Session])],
  providers: [SessionRepository],
  exports: [SessionRepository],
})
export class SessionModule {}