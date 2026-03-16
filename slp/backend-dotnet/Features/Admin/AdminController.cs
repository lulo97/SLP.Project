using backend_dotnet.Features.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace backend_dotnet.Features.Admin;

[Authorize(Roles = "admin")]
[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    // Users
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _adminService.GetAllUsersAsync();
        return Ok(users);
    }

    [HttpPost("users/{id}/ban")]
    public async Task<IActionResult> BanUser(int id)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var banned = await _adminService.BanUserAsync(adminId, id);
        if (!banned) return BadRequest("Cannot ban admin or user not found");
        return Ok();
    }

    [HttpPost("users/{id}/unban")]
    public async Task<IActionResult> UnbanUser(int id)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var unbanned = await _adminService.UnbanUserAsync(adminId, id);
        if (!unbanned) return NotFound();
        return Ok();
    }

    // Quizzes
    [HttpGet("quizzes")]
    public async Task<IActionResult> GetQuizzes()
    {
        var quizzes = await _adminService.GetAllQuizzesAsync();
        return Ok(quizzes);
    }

    [HttpPost("quizzes/{id}/disable")]
    public async Task<IActionResult> DisableQuiz(int id)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var disabled = await _adminService.DisableQuizAsync(adminId, id);
        if (!disabled) return NotFound();
        return Ok();
    }

    [HttpPost("quizzes/{id}/enable")]
    public async Task<IActionResult> EnableQuiz(int id)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var enabled = await _adminService.EnableQuizAsync(adminId, id);
        if (!enabled) return NotFound();
        return Ok();
    }

    // Comments
    [HttpGet("comments")]
    public async Task<IActionResult> GetComments([FromQuery] bool includeDeleted = false)
    {
        var comments = await _adminService.GetAllCommentsAsync(includeDeleted);
        return Ok(comments);
    }

    [HttpDelete("comments/{id}")]
    public async Task<IActionResult> DeleteComment(int id)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var deleted = await _adminService.DeleteCommentAsync(adminId, id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPost("comments/{id}/restore")]
    public async Task<IActionResult> RestoreComment(int id)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var restored = await _adminService.RestoreCommentAsync(adminId, id);
        if (!restored) return NotFound();
        return Ok();
    }

    // Logs
    [HttpGet("logs")]
    public async Task<IActionResult> GetLogs([FromQuery] int count = 100)
    {
        var logs = await _adminService.GetRecentLogsAsync(count);
        return Ok(logs);
    }
}