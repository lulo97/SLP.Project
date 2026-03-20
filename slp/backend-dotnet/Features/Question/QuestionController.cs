using backend_dotnet.Features.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Question;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class QuestionController : ControllerBase
{
    private readonly IQuestionService _questionService;
    private readonly IAuthService _authService;

    public QuestionController(IQuestionService questionService, IAuthService authService)
    {
        _questionService = questionService;
        _authService = authService;
    }

    private int? CurrentUserId => User.Identity?.IsAuthenticated == true
        ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")
        : null;

    private bool IsAdmin => User.IsInRole("admin");

    [HttpGet("{id}")]
    public async Task<IActionResult> GetQuestion(int id)
    {
        var question = await _questionService.GetQuestionByIdAsync(id);
        if (question == null)
            return NotFound();
        return Ok(question);
    }

    [HttpGet]
    public async Task<IActionResult> GetQuestions(
    [FromQuery] string? search,
    [FromQuery] string? type,
    [FromQuery] List<string>? tags,
    [FromQuery] bool? mine,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20)
    {
        // Enforce max page size
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 50) pageSize = 50;

        var searchDto = new QuestionSearchDto
        {
            SearchTerm = search,
            Type = type,
            Tags = tags,
            UserId = mine == true ? CurrentUserId : null
        };

        var results = await _questionService.SearchQuestionsAsync(searchDto, page, pageSize);
        return Ok(results);
    }

    [HttpPost]
    public async Task<IActionResult> CreateQuestion([FromBody] CreateQuestionDto dto)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        var question = await _questionService.CreateQuestionAsync(CurrentUserId.Value, dto);
        return CreatedAtAction(nameof(GetQuestion), new { id = question.Id }, question);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateQuestion(int id, [FromBody] UpdateQuestionDto dto)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        var updated = await _questionService.UpdateQuestionAsync(id, CurrentUserId.Value, dto);
        if (updated == null)
            return NotFound();
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteQuestion(int id)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        var deleted = await _questionService.DeleteQuestionAsync(id, CurrentUserId.Value, IsAdmin);
        if (!deleted)
            return NotFound();
        return NoContent();
    }
}