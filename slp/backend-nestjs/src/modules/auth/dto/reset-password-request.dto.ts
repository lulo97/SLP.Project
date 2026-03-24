import { IsString, MinLength } from 'class-validator';

export class ResetPasswordRequest {
  @IsString()
  token: string;

  @MinLength(6)
  newPassword: string;
}