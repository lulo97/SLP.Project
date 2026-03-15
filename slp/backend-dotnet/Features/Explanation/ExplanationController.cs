using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace backend_dotnet.Features.Explanation;

[ApiController]
[Route("api")]
public class ExplanationController : ControllerBase
{
    private readonly IExplanationService _service;

    public ExplanationController(IExplanationService service)
    {
        _service = service;
    }

    private int? CurrentUserId => User.Identity?.IsAuthenticated == true
        ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")
        : null;

    // GET /api/sources/{sourceId}/explanations
    [HttpGet("sources/{sourceId}/explanations")]
    public async Task<IActionResult> GetBySource(int sourceId)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();

        var items = await _service.GetBySourceAsync(sourceId, CurrentUserId.Value);
        return Ok(items);
    }

    // POST /api/explanations
    [HttpPost("explanations")]
    public async Task<IActionResult> Create([FromBody] CreateExplanationRequest request)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest("Content is required.");

        var created = await _service.CreateAsync(CurrentUserId.Value, request);
        return CreatedAtAction(nameof(GetBySource), new { sourceId = created.SourceId }, created);
    }

    // PUT /api/explanations/{id}
    [HttpPut("explanations/{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateExplanationRequest request)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest("Content is required.");

        var result = await _service.UpdateAsync(id, CurrentUserId.Value, request);
        if (result is null) return NotFound();
        return Ok(result);
    }

    // DELETE /api/explanations/{id}
    [HttpDelete("explanations/{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();

        var deleted = await _service.DeleteAsync(id, CurrentUserId.Value);
        if (!deleted) return NotFound();
        return NoContent();
    }
}