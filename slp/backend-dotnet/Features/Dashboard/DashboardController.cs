using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using backend_dotnet.Features.Dashboard;
using System.Security.Claims;

namespace backend_dotnet.Features.Dashboard;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("word-of-the-day")]
    public async Task<ActionResult<WordOfTheDayDto>> GetWordOfTheDay()
    {
        var word = await _dashboardService.GetWordOfTheDayAsync();
        return Ok(word);
    }

    [HttpGet("top-quizzes")]
    public async Task<ActionResult<List<TopQuizDto>>> GetTopQuizzes([FromQuery] int limit = 5)
    {
        if (limit < 1 || limit > 20) limit = 5;
        var quizzes = await _dashboardService.GetTopQuizzesAsync(limit);
        return Ok(quizzes);
    }

    [HttpGet("user-stats")]
    public async Task<ActionResult<UserStatsDto>> GetUserStats()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var stats = await _dashboardService.GetUserStatsAsync(userId);
        return Ok(stats);
    }
}