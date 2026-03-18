using backend_dotnet.Features.Comment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace backend_dotnet.Features.Comment;

[ApiController]
[Route("api/comments")]
public class CommentController : ControllerBase
{
    private readonly ICommentService _commentService;

    public CommentController(ICommentService commentService)
    {
        _commentService = commentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetForTarget([FromQuery] string targetType, [FromQuery] int targetId)
    {
        var comments = await _commentService.GetForTargetAsync(targetType, targetId);
        return Ok(comments);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var comment = await _commentService.GetByIdAsync(id);
        if (comment == null) return NotFound();
        return Ok(comment);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCommentRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var comment = await _commentService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = comment.Id }, comment);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCommentRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var updated = await _commentService.UpdateAsync(userId, id, request);
        if (updated == null) return Forbid();
        return Ok(updated);
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var isAdmin = User.IsInRole("admin"); // role check
        var deleted = await _commentService.DeleteAsync(userId, id, isAdmin);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpPost("{id}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var restored = await _commentService.RestoreAsync(adminId, id);
        if (!restored) return NotFound();
        return Ok();
    }

    [HttpGet("{id}/history")]
    public async Task<IActionResult> GetHistory(int id)
    {
        var history = await _commentService.GetHistoryAsync(id);
        if (history == null) return NotFound();
        return Ok(history);
    }
}