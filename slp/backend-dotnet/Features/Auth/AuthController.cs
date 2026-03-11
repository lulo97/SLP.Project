using backend_dotnet.Features.User;
using Microsoft.AspNetCore.Authorization;
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

    // POST /auth/login
    [HttpPost("auth/login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request.Username, request.Password);

        if (result == null)
            return Unauthorized(new { message = "Invalid credentials" });

        return Ok(result);
    }

    // POST /auth/logout
    [Authorize]
    [HttpPost("auth/logout")]
    public async Task<IActionResult> Logout()
    {
        await _authService.LogoutAsync(User);
        return Ok(new { message = "Logged out successfully" });
    }

    // POST /auth/reset-password
    [HttpPost("auth/reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        await _authService.RequestPasswordResetAsync(request.Email);
        return Ok(new { message = "Password reset email sent if account exists." });
    }

    // POST /auth/reset-password/confirm
    [HttpPost("auth/reset-password/confirm")]
    public async Task<IActionResult> ConfirmResetPassword([FromBody] ConfirmResetPasswordRequest request)
    {
        var success = await _authService.ConfirmPasswordResetAsync(
            request.Token,
            request.NewPassword);

        if (!success)
            return BadRequest(new { message = "Invalid or expired token" });

        return Ok(new { message = "Password reset successful" });
    }

    // POST /auth/verify-email
    [HttpPost("auth/verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        var success = await _authService.VerifyEmailAsync(request.Token);

        if (!success)
            return BadRequest(new { message = "Invalid verification token" });

        return Ok(new { message = "Email verified successfully" });
    }

    // GET /users/me
    [Authorize]
    [HttpGet("users/me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var user = await _userService.GetByIdAsync(userId);

        if (user == null)
            return NotFound();

        return Ok(user);
    }

    // PUT /users/me
    [Authorize]
    [HttpPut("users/me")]
    public async Task<IActionResult> UpdateCurrentUser([FromBody] UpdateUserRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var updated = await _userService.UpdateAsync(userId, request);

        return Ok(updated);
    }

    // POST /users/me/verify-email/send
    [Authorize]
    [HttpPost("users/me/verify-email/send")]
    public async Task<IActionResult> SendVerificationEmail()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        await _authService.SendVerificationEmailAsync(userId);

        return Ok(new { message = "Verification email sent." });
    }

    // POST /auth/register
    [HttpPost("auth/register")]
    public async Task<IActionResult> Register([FromBody] RegisterUserRequest request)
    {
        var user = await _userService.RegisterAsync(request);

        return Ok(user);
    }

    // DELETE /users/{id}
    [Authorize]
    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var currentUser = await _userService.GetByIdAsync(currentUserId);

        if (currentUser == null)
            return Unauthorized();

        if (currentUser.Username != "admin")
            return Forbid();

        var deleted = await _userService.DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return Ok(new { message = "User deleted successfully" });
    }
}