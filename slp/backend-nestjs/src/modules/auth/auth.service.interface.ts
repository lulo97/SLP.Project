import { LoginResult } from "./dto/login-result.dto";
import { LoginRequest } from "./dto/login-request.dto";
import { ChangePasswordResult } from "./dto/change-password-result.dto";

export interface IAuthService {
  login(loginDto: LoginRequest): Promise<LoginResult>;
  logout(userId: number, sessionId: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  confirmPasswordReset(token: string, newPassword: string): Promise<boolean>;
  verifyEmail(token: string): Promise<boolean>;
  sendVerificationEmail(userId: number): Promise<void>;
  changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
    currentSessionId?: string,
  ): Promise<ChangePasswordResult>;
}
