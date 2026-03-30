import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserRepository } from "../user/user.repository";
import { SessionRepository } from "../session/session.repository";
import type { IEmailService } from "../email/email.service.interface";
import { PasswordHasher } from "./password-hasher";
import { SessionTokenService } from "../session/session-token.service";
import { Session } from "../session/session.entity";
import { LoginResult } from "./dto/login-result.dto";
import { LoginRequest } from "./dto/login-request.dto";
import { IAuthService } from "./auth.service.interface";
import { ChangePasswordResult } from "./dto/change-password-result.dto";
import { EmailTemplates } from "../email/email-templates";

@Injectable()
export class AuthService implements IAuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly frontendBaseUrl: string;

  constructor(
    private userRepo: UserRepository,
    private sessionRepo: SessionRepository,
    @Inject("IEmailService") private emailService: IEmailService,
    private configService: ConfigService,
  ) {
    this.frontendBaseUrl =
      this.configService.get<string>("frontend.baseUrlForEmail") ||
      "http://localhost:3002";
  }

  async login(loginDto: LoginRequest): Promise<LoginResult> {
    const user = await this.userRepo.getByUsername(loginDto.username);
    if (!user) {
      return {
        success: false,
        errorCode: "USER_NOT_FOUND",
        message: "Invalid credentials",
      };
    }

    if (user.status !== "active") {
      return {
        success: false,
        errorCode: "ACCOUNT_BANNED",
        message: "Your account has been banned. Please contact support.",
      };
    }

    const valid = await PasswordHasher.verify(
      loginDto.password,
      user.passwordHash,
    );
    if (!valid) {
      return {
        success: false,
        errorCode: "INVALID_PASSWORD",
        message: "Invalid credentials",
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

    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    user.passwordResetToken = token;
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.userRepo.update(user);

    const resetLink = `${this.frontendBaseUrl}/reset-password?token=${token}`;
    const htmlBody = EmailTemplates.getPasswordResetEmail(resetLink);
    await this.emailService.sendHtmlAsync(
      user.email,
      "Reset Your Password",
      htmlBody,
    );
  }

  async confirmPasswordReset(
    token: string,
    newPassword: string,
  ): Promise<boolean> {
    const user = await this.userRepo.getByResetToken(token);
    if (
      !user ||
      !user.passwordResetExpiry ||
      user.passwordResetExpiry < new Date()
    ) {
      return false;
    }

    user.passwordHash = await PasswordHasher.hash(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await this.userRepo.update(user);

    // Revoke all sessions
    await this.sessionRepo.revokeAllForUser(user.id);
    return true;
  }

  async verifyEmail(token: string): Promise<boolean> {
    const user = await this.userRepo.getByEmailVerificationToken(token);
    if (!user) return false;

    user.emailConfirmed = true;
    user.emailVerificationToken = undefined;
    await this.userRepo.update(user);
    return true;
  }

  async sendVerificationEmail(userId: number): Promise<void> {
    const user = await this.userRepo.getById(userId);
    if (!user) return;

    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    user.emailVerificationToken = token;
    await this.userRepo.update(user);

    const verifyLink = `${this.frontendBaseUrl}/verify-email?token=${token}`;
    const htmlBody = EmailTemplates.getEmailVerificationEmail(verifyLink);
    await this.emailService.sendHtmlAsync(
      user.email,
      "Verify Your Email",
      htmlBody,
    );
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<ChangePasswordResult> {
    const user = await this.userRepo.getById(userId);
    if (!user) {
      return {
        success: false,
        errorCode: "USER_NOT_FOUND",
        message: "User not found.",
      };
    }

    const valid = await PasswordHasher.verify(
      currentPassword,
      user.passwordHash,
    );
    if (!valid) {
      return {
        success: false,
        errorCode: "INVALID_CURRENT_PASSWORD",
        message: "Current password is incorrect.",
      };
    }

    user.passwordHash = await PasswordHasher.hash(newPassword);
    user.updatedAt = new Date();
    await this.userRepo.update(user);

    // Revoke all sessions except the current one? .NET revokes all sessions.
    // The current session remains active (user stays logged in on this device).
    await this.sessionRepo.revokeAllForUser(user.id);

    return { success: true };
  }
}
