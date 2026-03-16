using backend_dotnet.Features.Auth;
using backend_dotnet.Features.Email;
using backend_dotnet.Features.Session;
using backend_dotnet.Features.User;
using System.Security.Claims;
using System.Text;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly ISessionRepository _sessions;
    private readonly IEmailService _email;

    public AuthService(
        IUserRepository users,
        ISessionRepository sessions,
        IEmailService email)
    {
        _users = users;
        _sessions = sessions;
        _email = email;
    }

    public async Task<LoginResponse?> LoginAsync(string username, string password)
    {
        var user = await _users.GetByUsernameAsync(username);
        if (user == null)
            return null;

        // Check if user is banned or inactive
        if (user.Status != "active")
            return null;

        if (!PasswordHasher.Verify(password, user.PasswordHash))
            return null;

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

        return new LoginResponse
        {
            Token = token,
            UserId = user.Id.ToString(),
            Email = user.Email
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

        if (user == null)
            return;

        var token = Guid.NewGuid().ToString();

        user.PasswordResetToken = token;
        user.PasswordResetExpiry = DateTime.UtcNow.AddHours(1);

        await _users.UpdateAsync(user);

        await _email.SendAsync(
            user.Email,
            "Password Reset",
            $"Reset token: {token}");
    }

    public async Task<bool> ConfirmPasswordResetAsync(string token, string newPassword)
    {
        var user = await _users.GetByResetTokenAsync(token);

        if (user == null)
            return false;

        if (user.PasswordResetExpiry < DateTime.UtcNow)
            return false;

        user.PasswordHash = PasswordHasher.Hash(newPassword);
        user.PasswordResetToken = null;
        user.PasswordResetExpiry = null;

        await _users.UpdateAsync(user);

        return true;
    }

    public async Task<bool> VerifyEmailAsync(string token)
    {
        var user = await _users.GetByEmailVerificationTokenAsync(token);

        if (user == null)
            return false;

        user.EmailConfirmed = true;               // was EmailVerified
        user.EmailVerificationToken = null;

        await _users.UpdateAsync(user);

        return true;
    }

    public async Task SendVerificationEmailAsync(string userId)
    {
        if (!int.TryParse(userId, out var id))    // parse string to int
            return;

        var user = await _users.GetByIdAsync(id);

        if (user == null)
            return;

        var token = Guid.NewGuid().ToString();

        user.EmailVerificationToken = token;

        await _users.UpdateAsync(user);

        await _email.SendAsync(
            user.Email,
            "Verify your email",
            $"Verification token: {token}");
    }
}