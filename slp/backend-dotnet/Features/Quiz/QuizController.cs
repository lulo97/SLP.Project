using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using backend_dotnet.Features.Auth;
using System.Security.Claims;

namespace backend_dotnet.Features.Quiz;

[ApiController]
[Route("api/[controller]")]
public class QuizController : ControllerBase
{
    private readonly IQuizService _quizService;
    private readonly IAuthService _authService;

    public QuizController(IQuizService quizService, IAuthService authService)
    {
        _quizService = quizService;
        _authService = authService;
    }

    private int? CurrentUserId => User.Identity?.IsAuthenticated == true
        ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")
        : null;

    private bool IsAdmin => User.IsInRole("admin");

    [HttpGet]
    public async Task<IActionResult> GetQuizzes([FromQuery] string? visibility, [FromQuery] string? search, [FromQuery] bool? mine)
    {
        if (mine == true)
        {
            if (!CurrentUserId.HasValue)
                return Unauthorized();
            var myQuizzes = await _quizService.GetUserQuizzesAsync(CurrentUserId.Value);
            return Ok(myQuizzes);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var results = await _quizService.SearchQuizzesAsync(search, CurrentUserId, publicOnly: true);
            return Ok(results);
        }

        var quizzes = await _quizService.GetPublicQuizzesAsync(visibility);
        return Ok(quizzes);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetQuiz(int id)
    {
        var quiz = await _quizService.GetQuizByIdAsync(id, CurrentUserId);
        if (quiz == null)
            return NotFound();
        return Ok(quiz);
    }

    [HttpPost]
    public async Task<IActionResult> CreateQuiz([FromBody] CreateQuizDto dto)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        var quiz = await _quizService.CreateQuizAsync(CurrentUserId.Value, dto);
        return CreatedAtAction(nameof(GetQuiz), new { id = quiz.Id }, quiz);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateQuiz(int id, [FromBody] UpdateQuizDto dto)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        var updated = await _quizService.UpdateQuizAsync(id, CurrentUserId.Value, dto);
        if (updated == null)
            return NotFound();
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteQuiz(int id)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        var deleted = await _quizService.DeleteQuizAsync(id, CurrentUserId.Value, IsAdmin);
        if (!deleted)
            return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/duplicate")]
    public async Task<IActionResult> DuplicateQuiz(int id)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        var duplicated = await _quizService.DuplicateQuizAsync(id, CurrentUserId.Value);
        if (duplicated == null)
            return NotFound();
        return CreatedAtAction(nameof(GetQuiz), new { id = duplicated.Id }, duplicated);
    }
}