namespace backend_dotnet.Features.Auth
{
    public record LoginRequest(string Username, string Password);

    public record ResetPasswordRequest(string Email);

    public record ConfirmResetPasswordRequest(
        string Token,
        string NewPassword
    );

    public record VerifyEmailRequest(string Token);

    public record UpdateUserRequest(
        string Name,
        string AvatarUrl
    );

    public class LoginResponse
    {
        public string Token { get; set; } = "";        // was SessionToken
        public string UserId { get; set; } = "";       // now string to match controller
        public string Email { get; set; } = "";
    }

    public record RegisterUserRequest(
        string Username,
        string Email,
        string Password
    );
}