using backend_dotnet.Features.Auth;
using backend_dotnet.Features.Email;
using backend_dotnet.Features.Session;
using backend_dotnet.Features.User;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using System.Text;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly ISessionRepository _sessions;
    private readonly IEmailService _email;
    private readonly string _frontendBaseUrl;

    public AuthService(
        IUserRepository users,
        ISessionRepository sessions,
        IEmailService email,
        IConfiguration configuration)
    {
        _users = users;
        _sessions = sessions;
        _email = email;
        _frontendBaseUrl = configuration.GetValue<string>("Frontend:BaseUrlForEmail")?.TrimEnd('/')
                           ?? "http://localhost:3002";
    }

    public async Task<LoginResult> LoginAsync(string username, string password)
    {
        var user = await _users.GetByUsernameAsync(username);
        if (user == null)
        {
            return new LoginResult
            {
                Success = false,
                ErrorCode = "USER_NOT_FOUND",
                Message = "Invalid credentials"
            };
        }

        if (user.Status != "active")
        {
            return new LoginResult
            {
                Success = false,
                ErrorCode = "ACCOUNT_BANNED",
                Message = "Your account has been banned. Please contact support."
            };
        }

        if (!PasswordHasher.Verify(password, user.PasswordHash))
        {
            return new LoginResult
            {
                Success = false,
                ErrorCode = "INVALID_PASSWORD",
                Message = "Invalid credentials"
            };
        }

        var token = SessionTokenService.GenerateToken();
        var tokenHash = SessionTokenService.HashToken(token);

        var session = new Session
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        await _sessions.CreateAsync(session);

        return new LoginResult
        {
            Success = true,
            Data = new LoginResponse
            {
                Token = token,
                UserId = user.Id.ToString(),
                Email = user.Email
            }
        };
    }

    public async Task LogoutAsync(ClaimsPrincipal user)
    {
        var sessionId = user.FindFirst("session_id")?.Value;
        if (sessionId != null)
            await _sessions.RevokeAsync(sessionId);
    }

    public async Task RequestPasswordResetAsync(string email)
    {
        var user = await _users.GetByEmailAsync(email);
        if (user == null) return;

        var token = Guid.NewGuid().ToString();
        user.PasswordResetToken = token;
        user.PasswordResetExpiry = DateTime.UtcNow.AddHours(1);
        await _users.UpdateAsync(user);

        // Build reset link using configured frontend URL
        var resetLink = $"{_frontendBaseUrl}/reset-password?token={token}";
        var htmlBody = EmailTemplates.GetPasswordResetEmail(resetLink);

        await _email.SendHtmlAsync(user.Email, "Reset Your Password", htmlBody);
    }

    public async Task<bool> ConfirmPasswordResetAsync(string token, string newPassword)
    {
        var user = await _users.GetByResetTokenAsync(token);
        if (user == null || user.PasswordResetExpiry < DateTime.UtcNow)
            return false;

        user.PasswordHash = PasswordHasher.Hash(newPassword);
        user.PasswordResetToken = null;
        user.PasswordResetExpiry = null;

        await _users.UpdateAsync(user);

        // Revoke all existing sessions for this user
        await _sessions.RevokeAllForUserAsync(user.Id);

        return true;
    }

    public async Task<bool> VerifyEmailAsync(string token)
    {
        var user = await _users.GetByEmailVerificationTokenAsync(token);
        if (user == null) return false;

        user.EmailConfirmed = true;
        user.EmailVerificationToken = null;

        await _users.UpdateAsync(user);
        return true;
    }

    public async Task SendVerificationEmailAsync(string userId)
    {
        if (!int.TryParse(userId, out var id)) return;

        var user = await _users.GetByIdAsync(id);
        if (user == null) return;

        var token = Guid.NewGuid().ToString();
        user.EmailVerificationToken = token;
        await _users.UpdateAsync(user);

        // Build verification link
        var verifyLink = $"{_frontendBaseUrl}/verify-email?token={token}";
        var htmlBody = EmailTemplates.GetEmailVerificationEmail(verifyLink);

        await _email.SendHtmlAsync(user.Email, "Verify Your Email", htmlBody);
    }

    public async Task<ChangePasswordResult> ChangePasswordAsync(
        string userId,
        string currentPassword,
        string newPassword)
    {
        if (!int.TryParse(userId, out var id))
        {
            return new ChangePasswordResult
            {
                Success = false,
                ErrorCode = "USER_NOT_FOUND",
                Message = "User not found."
            };
        }

        var user = await _users.GetByIdAsync(id);
        if (user == null)
        {
            return new ChangePasswordResult
            {
                Success = false,
                ErrorCode = "USER_NOT_FOUND",
                Message = "User not found."
            };
        }

        if (!PasswordHasher.Verify(currentPassword, user.PasswordHash))
        {
            return new ChangePasswordResult
            {
                Success = false,
                ErrorCode = "INVALID_CURRENT_PASSWORD",
                Message = "Current password is incorrect."
            };
        }

        user.PasswordHash = PasswordHasher.Hash(newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _users.UpdateAsync(user);

        // Revoke all sessions so other devices must re-login.
        // The current session is intentionally kept alive so the user
        // is not immediately logged out on this device.
        await _sessions.RevokeAllForUserAsync(user.Id);

        return new ChangePasswordResult { Success = true };
    }
}