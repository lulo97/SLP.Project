import { LoginResponse } from './login-response.dto';

export class LoginResult {
  success: boolean;
  data?: LoginResponse;
  errorCode?: string; // USER_NOT_FOUND, INVALID_PASSWORD, ACCOUNT_BANNED, EMAIL_NOT_VERIFIED
  message?: string;
}