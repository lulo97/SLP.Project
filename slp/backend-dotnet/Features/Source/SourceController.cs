using Microsoft.AspNetCore.Mvc;
using backend_dotnet.Features.Auth;
using System.Security.Claims;
using backend_dotnet.Features.Progress;

namespace backend_dotnet.Features.Source;

[ApiController]
[Route("api/[controller]")]   // → /api/source
public class SourceController : ControllerBase
{
    private readonly ISourceService _sourceService;
    private readonly IAuthService _authService;
    private readonly IProgressService _progressService;

    public SourceController(
        ISourceService sourceService,
        IAuthService authService,
        IProgressService progressService)
    {
        _sourceService = sourceService;
        _authService = authService;
        _progressService = progressService;
    }

    private int? CurrentUserId => User.Identity?.IsAuthenticated == true
        ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")
        : null;

    private bool IsAdmin => User.IsInRole("admin");

    // ── Sources ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetMySources()
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        var sources = await _sourceService.GetUserSourcesAsync(CurrentUserId.Value);
        return Ok(sources);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSource(int id)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        var source = await _sourceService.GetSourceByIdAsync(id, CurrentUserId.Value);
        if (source == null) return NotFound();
        return Ok(source);
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadSource([FromForm] UploadSourceRequest request)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        try
        {
            var source = await _sourceService.UploadSourceAsync(CurrentUserId.Value, request.File, request.Title);
            return CreatedAtAction(nameof(GetSource), new { id = source.Id }, source);
        }
        catch (ArgumentException ex) { return BadRequest(ex.Message); }
    }

    [HttpPost("url")]
    public async Task<IActionResult> CreateFromUrl([FromBody] UrlSourceDto dto)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        var source = await _sourceService.CreateSourceFromUrlAsync(CurrentUserId.Value, dto.Url, dto.Title);
        return CreatedAtAction(nameof(GetSource), new { id = source.Id }, source);
    }

    [HttpPost("note")]
    public async Task<IActionResult> CreateFromNote([FromBody] CreateNoteSourceRequest request)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        try
        {
            var source = await _sourceService.CreateNoteSourceAsync(CurrentUserId.Value, request.Title, request.Content);
            return CreatedAtAction(nameof(GetSource), new { id = source.Id }, source);
        }
        catch (ArgumentException ex) { return BadRequest(ex.Message); }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSource(int id)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        var deleted = await _sourceService.DeleteSourceAsync(id, CurrentUserId.Value, IsAdmin);
        if (!deleted) return NotFound();
        return NoContent();
    }

    // ── Progress ─────────────────────────────────────────────────────────────

    // GET /api/source/{id}/progress
    [HttpGet("{id}/progress")]
    public async Task<IActionResult> GetProgress(int id)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();

        // Verify source ownership
        var source = await _sourceService.GetSourceByIdAsync(id, CurrentUserId.Value);
        if (source == null) return NotFound();

        var progress = await _progressService.GetProgressAsync(CurrentUserId.Value, id);
        return Ok(progress);
    }

    // PUT /api/source/{id}/progress
    [HttpPut("{id}/progress")]
    public async Task<IActionResult> UpdateProgress(int id, [FromBody] UpdateProgressRequest request)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();

        var source = await _sourceService.GetSourceByIdAsync(id, CurrentUserId.Value);
        if (source == null) return NotFound();

        var result = await _progressService.UpdateProgressAsync(CurrentUserId.Value, id, request);
        return Ok(result);
    }
}

public class UrlSourceDto
{
    public string Url { get; set; } = string.Empty;
    public string? Title { get; set; }
}