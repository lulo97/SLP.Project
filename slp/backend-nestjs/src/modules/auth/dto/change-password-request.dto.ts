import { IsNotEmpty, IsString } from 'class-validator';

export class ChangePasswordRequest {
  @IsString()
  currentPassword: string;

  @IsNotEmpty()
  newPassword: string;
}