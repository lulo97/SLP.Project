export class ChangePasswordResult {
  success: boolean;
  errorCode?: string;  // "USER_NOT_FOUND" | "INVALID_CURRENT_PASSWORD"
  message?: string;
}