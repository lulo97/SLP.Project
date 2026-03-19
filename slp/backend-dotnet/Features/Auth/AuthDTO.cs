namespace backend_dotnet.Features.Auth
{
    public record LoginRequest(string Username, string Password);

    public record ForgotPasswordRequest(string Email);

    public record ResetPasswordRequest(string Token, string NewPassword);

    public record VerifyEmailRequest(string Token);

    public record UpdateUserRequest(string Name, string AvatarUrl);

    public class LoginResponse
    {
        public string Token { get; set; } = "";
        public string UserId { get; set; } = "";
        public string Email { get; set; } = "";
    }

    public record RegisterUserRequest(
        string Username,
        string Email,
        string Password
    );

    public class LoginResult
    {
        public bool Success { get; set; }
        public LoginResponse? Data { get; set; }
        public string? ErrorCode { get; set; }   // e.g., "USER_NOT_FOUND", "INVALID_PASSWORD", "ACCOUNT_BANNED", "EMAIL_NOT_VERIFIED"
        public string? Message { get; set; }
    }
}