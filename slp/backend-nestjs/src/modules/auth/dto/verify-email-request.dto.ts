import { IsString } from 'class-validator';

export class VerifyEmailRequest {
  @IsString()
  token: string;
}