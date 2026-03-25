import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './session.entity';
import { SessionRepository } from './session.repository';
import { SessionTokenService } from './session-token.service';

@Module({
  imports: [TypeOrmModule.forFeature([Session])],
  providers: [
    SessionRepository,
    SessionTokenService,
  ],
  exports: [
    SessionRepository,   // Export SessionRepository for other modules (e.g., TagModule)
  ],
})
export class SessionModule {}