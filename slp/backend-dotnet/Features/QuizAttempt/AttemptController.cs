using backend_dotnet.Features.Auth;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace backend_dotnet.Features.QuizAttempt;

[ApiController]
[Route("api/quizzes/{quizId}/attempts")]
public class AttemptController : ControllerBase
{
    private readonly IAttemptService _attemptService;
    private readonly IAuthService _authService;

    public AttemptController(IAttemptService attemptService, IAuthService authService)
    {
        _attemptService = attemptService;
        _authService = authService;
    }

    private int? CurrentUserId => User.Identity?.IsAuthenticated == true
        ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")
        : null;

    private bool IsAdmin => User.IsInRole("admin");

    // POST /api/quizzes/{quizId}/attempts
    [HttpPost]
    public async Task<IActionResult> StartAttempt(int quizId)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        try
        {
            var result = await _attemptService.StartAttemptAsync(quizId, CurrentUserId.Value);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // GET /api/attempts/{id}
    [HttpGet("~/api/attempts/{id}")]
    public async Task<IActionResult> GetAttempt(int id)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        var attempt = await _attemptService.GetAttemptAsync(id, CurrentUserId.Value, IsAdmin);
        if (attempt == null)
            return NotFound();
        return Ok(attempt);
    }

    // POST /api/attempts/{id}/answers
    [HttpPost("~/api/attempts/{id}/answers")]
    public async Task<IActionResult> SubmitAnswer(int id, [FromBody] SubmitAnswerDto dto)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        try
        {
            await _attemptService.SubmitAnswerAsync(id, CurrentUserId.Value, dto);
            return Ok();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // POST /api/attempts/{id}/submit
    [HttpPost("~/api/attempts/{id}/submit")]
    public async Task<IActionResult> SubmitAttempt(int id)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        try
        {
            var result = await _attemptService.SubmitAttemptAsync(id, CurrentUserId.Value);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // GET /api/attempts/{id}/review
    [HttpGet("~/api/attempts/{id}/review")]
    public async Task<IActionResult> GetAttemptReview(int id)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        var review = await _attemptService.GetAttemptReviewAsync(id, CurrentUserId.Value, IsAdmin);
        if (review == null)
            return NotFound();
        return Ok(review);
    }

    // GET /api/quizzes/{quizId}/attempts
    [HttpGet]
    public async Task<IActionResult> GetAttemptsForQuiz(int quizId)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        var attempts = await _attemptService.GetUserAttemptsForQuizAsync(quizId, CurrentUserId.Value);
        return Ok(attempts);
    }
}