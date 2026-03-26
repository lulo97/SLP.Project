import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './session.entity';
import { SessionRepository } from './session.repository';
import { SessionTokenService } from './session-token.service';
import { SessionGuard } from './session.guard'; // import guard

@Module({
  imports: [TypeOrmModule.forFeature([Session])],
  providers: [
    SessionRepository,
    SessionTokenService,SessionGuard
  ],
  exports: [
    SessionRepository,SessionGuard
  ],
})
export class SessionModule {}