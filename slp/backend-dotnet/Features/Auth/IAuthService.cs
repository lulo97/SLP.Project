using backend_dotnet.Features.Auth;
using System.Security.Claims;

public interface IAuthService
{
    Task<LoginResult> LoginAsync(string username, string password);
    Task LogoutAsync(ClaimsPrincipal user);

    Task RequestPasswordResetAsync(string email);
    Task<bool> ConfirmPasswordResetAsync(string token, string newPassword);

    Task<bool> VerifyEmailAsync(string token);
    Task SendVerificationEmailAsync(string userId);

    /// <summary>
    /// Validates <paramref name="currentPassword"/> against the stored hash,
    /// then replaces it with <paramref name="newPassword"/> and revokes all
    /// existing sessions so the user must re-login on other devices.
    /// Returns false when the current password is wrong or the user is not found.
    /// </summary>
    Task<ChangePasswordResult> ChangePasswordAsync(
        string userId,
        string currentPassword,
        string newPassword);
}

