import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { SessionModule } from '../session/session.module';
import { EmailModule } from '../email/email.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [UserModule, SessionModule, EmailModule],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}