import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterUserRequest {
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}