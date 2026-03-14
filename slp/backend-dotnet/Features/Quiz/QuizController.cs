using backend_dotnet.Features.Auth;
using backend_dotnet.Features.Note;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

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

    [HttpGet("{quizId}/questions")]
    public async Task<IActionResult> GetQuizQuestions(int quizId)
    {
        var questions = await _quizService.GetQuizQuestionsAsync(quizId, CurrentUserId);
        return Ok(questions);
    }

    // GET /api/quiz/questions/{id}
    [HttpGet("questions/{id}")]
    public async Task<IActionResult> GetQuizQuestion(int id)
    {
        var question = await _quizService.GetQuizQuestionByIdAsync(id, CurrentUserId);
        if (question == null)
            return NotFound();
        return Ok(question);
    }

    // POST /api/quiz/{quizId}/questions
    [HttpPost("{quizId}/questions")]
    public async Task<IActionResult> CreateQuizQuestion(int quizId, [FromBody] CreateQuizQuestionDto dto)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        try
        {
            var question = await _quizService.CreateQuizQuestionAsync(quizId, CurrentUserId.Value, dto);
            return CreatedAtAction(nameof(GetQuizQuestion), new { id = question.Id }, question);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    // PUT /api/quiz/questions/{id}
    [HttpPut("questions/{id}")]
    public async Task<IActionResult> UpdateQuizQuestion(int id, [FromBody] UpdateQuizQuestionDto dto)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        try
        {
            var updated = await _quizService.UpdateQuizQuestionAsync(id, CurrentUserId.Value, dto);
            if (updated == null)
                return NotFound();
            return Ok(updated);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    // DELETE /api/quiz/questions/{id}
    [HttpDelete("questions/{id}")]
    public async Task<IActionResult> DeleteQuizQuestion(int id)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        var deleted = await _quizService.DeleteQuizQuestionAsync(id, CurrentUserId.Value, IsAdmin);
        if (!deleted)
            return NotFound();
        return NoContent();
    }

    [HttpGet("{quizId}/notes")]
    public async Task<IActionResult> GetQuizNotes(int quizId)
    {
        var notes = await _quizService.GetQuizNotesAsync(quizId, CurrentUserId);
        return Ok(notes);
    }

    [HttpPost("{quizId}/notes")]
    public async Task<IActionResult> AddNoteToQuiz(int quizId, [FromBody] AddNoteToQuizDto dto)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        try
        {
            var note = await _quizService.AddNoteToQuizAsync(quizId, CurrentUserId.Value, dto);
            return CreatedAtAction(nameof(GetQuizNotes), new { quizId }, note);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("{quizId}/notes/{noteId}")]
    public async Task<IActionResult> RemoveNoteFromQuiz(int quizId, int noteId)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        var removed = await _quizService.RemoveNoteFromQuizAsync(quizId, noteId, CurrentUserId.Value, IsAdmin);
        if (!removed)
            return NotFound();
        return NoContent();
    }

    [HttpGet("{quizId}/sources")]
    public async Task<IActionResult> GetQuizSources(int quizId)
    {
        var sources = await _quizService.GetQuizSourcesAsync(quizId, CurrentUserId);
        return Ok(sources);
    }

    // POST /api/quiz/{quizId}/sources
    [HttpPost("{quizId}/sources")]
    public async Task<IActionResult> AddSourceToQuiz(int quizId, [FromBody] AddSourceToQuizDto dto)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        try
        {
            var source = await _quizService.AddSourceToQuizAsync(quizId, CurrentUserId.Value, dto.SourceId);
            return Ok(source);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    // DELETE /api/quiz/{quizId}/sources/{sourceId}
    [HttpDelete("{quizId}/sources/{sourceId}")]
    public async Task<IActionResult> RemoveSourceFromQuiz(int quizId, int sourceId)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        var removed = await _quizService.RemoveSourceFromQuizAsync(quizId, sourceId, CurrentUserId.Value, IsAdmin);
        if (!removed)
            return NotFound();

        return NoContent();
    }
}