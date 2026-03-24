import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Session } from '../session/session.entity';
import { UserRepository } from '../user/user.repository';
import { SessionRepository } from '../session/session.repository';
import { EmailModule } from '../email/email.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserService } from '../user/user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session]),
    EmailModule, // provides IEmailService
  ],
  providers: [
    // Repository implementations as custom providers (if using interfaces)
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'ISessionRepository',
      useClass: SessionRepository,
    },
    AuthService,
    UserService,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}