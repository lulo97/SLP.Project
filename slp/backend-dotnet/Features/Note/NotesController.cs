using Microsoft.AspNetCore.Mvc;
using backend_dotnet.Features.Auth;
using System.Security.Claims;

namespace backend_dotnet.Features.Note;

[ApiController]
[Route("api/[controller]")]   // → /api/notes
public class NotesController : ControllerBase
{
    private readonly INoteService _noteService;
    private readonly IAuthService _authService;

    public NotesController(INoteService noteService, IAuthService authService)
    {
        _noteService = noteService;
        _authService = authService;
    }

    private int? CurrentUserId => User.Identity?.IsAuthenticated == true
        ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")
        : null;

    // GET /api/notes
    [HttpGet]
    public async Task<IActionResult> GetMyNotes()
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        var notes = await _noteService.GetUserNotesAsync(CurrentUserId.Value);
        return Ok(notes);
    }

    // GET /api/notes/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetNote(int id)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        var note = await _noteService.GetNoteByIdAsync(id, CurrentUserId.Value);
        if (note == null) return NotFound();
        return Ok(note);
    }

    // POST /api/notes
    [HttpPost]
    public async Task<IActionResult> CreateNote([FromBody] CreateNoteRequest request)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
            return BadRequest("Title and content are required.");

        var note = await _noteService.CreateNoteAsync(CurrentUserId.Value, request.Title, request.Content);
        return CreatedAtAction(nameof(GetNote), new { id = note.Id }, note);
    }

    // PUT /api/notes/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateNote(int id, [FromBody] UpdateNoteRequest request)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
            return BadRequest("Title and content are required.");

        var updated = await _noteService.UpdateNoteAsync(id, CurrentUserId.Value, request.Title, request.Content);
        if (updated == null) return NotFound();
        return Ok(updated);
    }

    // DELETE /api/notes/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNote(int id)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        var deleted = await _noteService.DeleteNoteAsync(id, CurrentUserId.Value);
        if (!deleted) return NotFound();
        return NoContent();
    }
}

public class CreateNoteRequest
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class UpdateNoteRequest
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}