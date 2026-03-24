using backend_dotnet.Features.User;
using backend_dotnet.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace backend_dotnet.Features.Auth;

[ApiController]
[Route("api")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IUserService _userService;

    public AuthController(
        IAuthService authService,
        IUserService userService)
    {
        _authService = authService;
        _userService = userService;
    }

    // POST /api/auth/login
    [HttpPost("auth/login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request.Username, request.Password);

        if (!result.Success)
        {
            return result.ErrorCode switch
            {
                "USER_NOT_FOUND" or "INVALID_PASSWORD" => Unauthorized(new { code = result.ErrorCode, message = result.Message }),
                "ACCOUNT_BANNED" => Unauthorized(new { code = result.ErrorCode, message = result.Message }),
                "EMAIL_NOT_VERIFIED" => Unauthorized(new { code = result.ErrorCode, message = result.Message }),
                _ => Unauthorized(new { code = "LOGIN_FAILED", message = "Login failed" })
            };
        }

        return Ok(result.Data);
    }

    // POST /api/auth/logout
    [Authorize]
    [HttpPost("auth/logout")]
    public async Task<IActionResult> Logout()
    {
        await _authService.LogoutAsync(User);
        return Ok(new { message = "Logged out successfully" });
    }

    // POST /api/auth/forgot-password (send reset email)
    [HttpPost("auth/forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        await _authService.RequestPasswordResetAsync(request.Email);
        return Ok(new { message = "Password reset email sent if account exists." });
    }

    // POST /api/auth/reset-password (confirm reset)
    [HttpPost("auth/reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var success = await _authService.ConfirmPasswordResetAsync(
            request.Token,
            request.NewPassword);

        if (!success)
            return BadRequest(new { message = "Invalid or expired token" });

        return Ok(new { message = "Password reset successful" });
    }

    // POST /api/auth/verify-email
    [HttpPost("auth/verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        var success = await _authService.VerifyEmailAsync(request.Token);

        if (!success)
            return BadRequest(new { message = "Invalid verification token" });

        return Ok(new { message = "Email verified successfully" });
    }

    // POST /api/auth/resend-verification
    [Authorize]
    [HttpPost("auth/resend-verification")]
    public async Task<IActionResult> ResendVerification()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        await _authService.SendVerificationEmailAsync(userId);
        return Ok(new { message = "Verification email sent." });
    }

    // POST /api/users/me/change-password
    [Authorize]
    [HttpPost("users/me/change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        // Basic length guard – real validation lives in the service
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
            return BadRequest(new
            {
                code = "WEAK_PASSWORD",
                message = "New password must be at least 8 characters."
            });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var result = await _authService.ChangePasswordAsync(
            userId!,
            request.CurrentPassword,
            request.NewPassword);

        if (!result.Success)
        {
            return result.ErrorCode switch
            {
                "INVALID_CURRENT_PASSWORD" => BadRequest(new { code = result.ErrorCode, message = result.Message }),
                "USER_NOT_FOUND" => NotFound(new { code = result.ErrorCode, message = result.Message }),
                _ => StatusCode(500, new { message = "An unexpected error occurred." })
            };
        }

        return Ok(new { message = "Password changed successfully." });
    }

    // GET /api/users/me
    [Authorize]
    [HttpGet("users/me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _userService.GetByIdAsync(userId);
        if (user == null) return NotFound();

        var dto = new CurrentUserDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            EmailConfirmed = user.EmailConfirmed,
            Role = user.Role,
            Status = user.Status,
            AvatarFilename = user.AvatarFilename,
            CreatedAt = user.CreatedAt
        };

        return Ok(dto);
    }

    // PUT /api/users/me
    [Authorize]
    [HttpPut("users/me")]
    public async Task<IActionResult> UpdateCurrentUser([FromBody] UpdateUserRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var updated = await _userService.UpdateAsync(userId, request);
        return Ok(updated);
    }

    // POST /api/auth/register
    [HttpPost("auth/register")]
    public async Task<IActionResult> Register([FromBody] RegisterUserRequest request)
    {
        var user = await _userService.RegisterAsync(request);
        return Ok(user);
    }

    // DELETE /api/users/{id}
    [Authorize]
    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null) return NotFound();
        var currentUser = await _userService.GetByIdAsync(currentUserId);
        if (currentUser == null) return Unauthorized();
        if (currentUser.Username != "admin") return Forbid();

        var deleted = await _userService.DeleteAsync(id);
        if (!deleted) return NotFound();
        return Ok(new { message = "User deleted successfully" });
    }
}