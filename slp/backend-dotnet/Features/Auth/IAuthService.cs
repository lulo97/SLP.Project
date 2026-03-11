using backend_dotnet.Features.Auth;
using System.Security.Claims;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(string username, string password);
    Task LogoutAsync(ClaimsPrincipal user);

    Task RequestPasswordResetAsync(string email);
    Task<bool> ConfirmPasswordResetAsync(string token, string newPassword);

    Task<bool> VerifyEmailAsync(string token);
    Task SendVerificationEmailAsync(string userId);
}