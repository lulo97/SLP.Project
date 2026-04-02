import { IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordRequest {
  @IsString()
  token: string;

  @IsNotEmpty()
  newPassword: string;
}