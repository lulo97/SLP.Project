import { IsString, MinLength } from 'class-validator';

export class ChangePasswordRequest {
  @IsString()
  currentPassword: string;

  @MinLength(6)
  newPassword: string;
}