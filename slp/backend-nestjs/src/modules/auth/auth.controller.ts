import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UserService } from "../user/user.service";
import { SessionGuard } from "../../common/guards/session.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { LoginRequest } from "./dto/login-request.dto";
import { ForgotPasswordRequest } from "./dto/forgot-password-request.dto";
import { ResetPasswordRequest } from "./dto/reset-password-request.dto";
import { VerifyEmailRequest } from "./dto/verify-email-request.dto";
import { UpdateUserRequest } from "./dto/update-user-request.dto";
import { RegisterUserRequest } from "./dto/register-user-request.dto";
import { CurrentUserDto } from "./dto/current-user.dto";
import { ChangePasswordRequest } from "./dto/change-password-request.dto";

@Controller("api")
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  // POST /api/auth/login
  @Post("auth/login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginRequest) {
    const result = await this.authService.login(loginDto);
    if (!result.success) {
      switch (result.errorCode) {
        case "USER_NOT_FOUND":
        case "INVALID_PASSWORD":
          throw new UnauthorizedException({
            code: result.errorCode,
            message: result.message,
          });
        case "ACCOUNT_BANNED":
          throw new UnauthorizedException({
            code: result.errorCode,
            message: result.message,
          });
        case "EMAIL_NOT_VERIFIED":
          throw new UnauthorizedException({
            code: result.errorCode,
            message: result.message,
          });
        default:
          throw new UnauthorizedException({
            code: "LOGIN_FAILED",
            message: "Login failed",
          });
      }
    }
    return result.data;
  }

  // POST /api/auth/logout
  @Post("auth/logout")
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    await this.authService.logout(req.user.id, req.user.sessionId);
    return { message: "Logged out successfully" };
  }

  // POST /api/auth/forgot-password
  @Post("auth/forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordRequest) {
    await this.authService.requestPasswordReset(body.email);
    return { message: "Password reset email sent if account exists." };
  }

  // POST /api/auth/reset-password
  @Post("auth/reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordRequest) {
    const success = await this.authService.confirmPasswordReset(
      body.token,
      body.newPassword,
    );
    if (!success) {
      throw new UnauthorizedException({ message: "Invalid or expired token" });
    }
    return { message: "Password reset successful" };
  }

  // POST /api/auth/verify-email
  @Post("auth/verify-email")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: VerifyEmailRequest) {
    const success = await this.authService.verifyEmail(body.token);
    if (!success) {
      throw new UnauthorizedException({
        message: "Invalid verification token",
      });
    }
    return { message: "Email verified successfully" };
  }

  // POST /api/auth/resend-verification
  @Post("auth/resend-verification")
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Request() req) {
    await this.authService.sendVerificationEmail(req.user.id);
    return { message: "Verification email sent." };
  }

  // GET /api/users/me
  @Get("users/me")
  @UseGuards(SessionGuard)
  async getCurrentUser(@Request() req) {
    const user = await this.userService.getById(req.user.id);
    if (!user) {
      throw new UnauthorizedException();
    }
    const dto: CurrentUserDto = {
      id: user.id,
      username: user.username,
      email: user.email,
      emailConfirmed: user.emailConfirmed,
      role: user.role,
      status: user.status,
      avatarFilename: user.avatarFilename,
      createdAt: user.createdAt,
    };
    return dto;
  }

  // PUT /api/users/me
  @Put("users/me")
  @UseGuards(SessionGuard)
  async updateCurrentUser(@Request() req, @Body() dto: UpdateUserRequest) {
    const updated = await this.userService.update(req.user.id, dto);
    return updated;
  }

  // POST /api/auth/register
  @Post("auth/register")
  @HttpCode(HttpStatus.OK)
  async register(@Body() dto: RegisterUserRequest) {
    const user = await this.userService.register(dto);
    return user;
  }

  // DELETE /api/users/:id (admin only)
  @Delete("users/:id")
  @UseGuards(SessionGuard, RolesGuard)
  @Roles("admin")
  async deleteUser(@Param("id") id: string, @Request() req) {
    const userId = parseInt(id, 10);
    await this.userService.delete(userId);
    return { message: "User deleted successfully" };
  }

  @Post("users/me/change-password")
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Request() req, @Body() dto: ChangePasswordRequest) {
    const result = await this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );

    if (!result.success) {
      switch (result.errorCode) {
        case "INVALID_CURRENT_PASSWORD":
          throw new UnauthorizedException({
            code: result.errorCode,
            message: result.message,
          });
        case "USER_NOT_FOUND":
          throw new NotFoundException({
            code: result.errorCode,
            message: result.message,
          });
        default:
          throw new InternalServerErrorException({
            message: "An unexpected error occurred.",
          });
      }
    }

    return { message: "Password changed successfully." };
  }
}
