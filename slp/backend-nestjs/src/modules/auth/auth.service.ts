import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUserRepository } from '../user/user.repository';
import { ISessionRepository } from '../session/session.repository';
import { IEmailService } from '../email/email.service.interface';
import { PasswordHasher } from './password-hasher';
import { SessionTokenService } from '../session/session-token.service';
import { Session } from '../session/session.entity';
import { LoginResult } from './dto/login-result.dto';
import { LoginRequest } from './dto/login-request.dto';

@Injectable()
export class AuthService implements IAuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly frontendBaseUrl: string;

  constructor(
    @Inject('IUserRepository') private userRepo: IUserRepository,
    @Inject('ISessionRepository') private sessionRepo: ISessionRepository,
    @Inject('IEmailService') private emailService: IEmailService,
    private configService: ConfigService,
  ) {
    this.frontendBaseUrl = this.configService.get<string>('frontend.baseUrlForEmail') || 'http://localhost:3002';
  }

  async login(loginDto: LoginRequest): Promise<LoginResult> {
    const user = await this.userRepo.getByUsername(loginDto.username);
    if (!user) {
      return {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: 'Invalid credentials',
      };
    }

    if (user.status !== 'active') {
      return {
        success: false,
        errorCode: 'ACCOUNT_BANNED',
        message: 'Your account has been banned. Please contact support.',
      };
    }

    const valid = await PasswordHasher.verify(loginDto.password, user.passwordHash);
    if (!valid) {
      return {
        success: false,
        errorCode: 'INVALID_PASSWORD',
        message: 'Invalid credentials',
      };
    }

    // Optional: email verification check
    // if (!user.emailConfirmed) {
    //   return {
    //     success: false,
    //     errorCode: 'EMAIL_NOT_VERIFIED',
    //     message: 'Please verify your email before logging in.',
    //   };
    // }

    const token = SessionTokenService.generateToken();
    const tokenHash = SessionTokenService.hashToken(token);

    const session = new Session();
    session.userId = user.id;
    session.tokenHash = tokenHash;
    session.createdAt = new Date();
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.sessionRepo.create(session);

    return {
      success: true,
      data: {
        token,
        userId: user.id.toString(),
        email: user.email,
      },
    };
  }

  async logout(userId: number, sessionId: string): Promise<void> {
    // Revoke the specific session
    await this.sessionRepo.revoke(sessionId);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepo.getByEmail(email);
    if (!user) return;

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    user.passwordResetToken = token;
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.userRepo.update(user);

    const resetLink = `${this.frontendBaseUrl}/reset-password?token=${token}`;
    const htmlBody = `
      <h1>Reset Your Password</h1>
      <p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;
    await this.emailService.sendHtml(user.email, 'Reset Your Password', htmlBody);
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<boolean> {
    const user = await this.userRepo.getByResetToken(token);
    if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      return false;
    }

    user.passwordHash = await PasswordHasher.hash(newPassword);
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    await this.userRepo.update(user);

    // Revoke all sessions
    await this.sessionRepo.revokeAllForUser(user.id);
    return true;
  }

  async verifyEmail(token: string): Promise<boolean> {
    const user = await this.userRepo.getByEmailVerificationToken(token);
    if (!user) return false;

    user.emailConfirmed = true;
    user.emailVerificationToken = null;
    await this.userRepo.update(user);
    return true;
  }

  async sendVerificationEmail(userId: number): Promise<void> {
    const user = await this.userRepo.getById(userId);
    if (!user) return;

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    user.emailVerificationToken = token;
    await this.userRepo.update(user);

    const verifyLink = `${this.frontendBaseUrl}/verify-email?token=${token}`;
    const htmlBody = `
      <h1>Verify Your Email</h1>
      <p>Click <a href="${verifyLink}">here</a> to verify your email address.</p>
      <p>If you did not create an account, please ignore this email.</p>
    `;
    await this.emailService.sendHtml(user.email, 'Verify Your Email', htmlBody);
  }
}