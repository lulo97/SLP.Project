using backend_dotnet.Features.FileStorage;
using backend_dotnet.Features.User;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace backend_dotnet.Features.Avatar;

/// <summary>
/// Handles avatar upload and removal for the authenticated user.
/// The database stores only the bare filename; the public URL is computed here.
/// Route: /api/avatar
/// </summary>
[ApiController]
[Route("api/avatar")]
[Authorize]
public sealed class AvatarController : ControllerBase
{
    private static readonly HashSet<string> AllowedMime =
        new(StringComparer.OrdinalIgnoreCase) { "image/jpeg", "image/png" };

    private const long MaxBytes = 2 * 1024 * 1024; // 2 MB

    private readonly IFileStorageClient _storage;
    private readonly IUserRepository _users;
    private readonly FileStorageSettings _settings;
    private readonly ILogger<AvatarController> _logger;

    public AvatarController(
        IFileStorageClient storage,
        IUserRepository users,
        IOptions<FileStorageSettings> settings,
        ILogger<AvatarController> logger)
    {
        _storage  = storage;
        _users    = users;
        _settings = settings.Value;
        _logger   = logger;
    }

    // ── POST /api/avatar ──────────────────────────────────────────────────────

    /// <summary>Upload or replace the authenticated user's avatar.</summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        // --- Validate ---
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        if (!AllowedMime.Contains(file.ContentType))
            return StatusCode(415, new { message = "Only JPEG and PNG images are allowed." });

        if (file.Length > MaxBytes)
            return StatusCode(413, new { message = "File exceeds the 2 MB limit." });

        // --- Load user ---
        var user = await _users.GetByIdAsync(userId.Value);
        if (user == null) return NotFound();

        // --- Delete old avatar file (best-effort) ---
        if (!string.IsNullOrWhiteSpace(user.AvatarFilename))
        {
            try { await _storage.DeleteFileAsync(user.AvatarFilename); }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not delete previous avatar for user {UserId}", userId);
            }
        }

        // --- Upload new file; service returns just the filename ---
        await using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var bytes = ms.ToArray();

        string newFilename;
        try
        {
            newFilename = await _storage.UploadAvatarAsync(bytes, file.ContentType, file.FileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Avatar upload failed for user {UserId}", userId);
            return StatusCode(502, new { message = "File storage service error. Please try again." });
        }

        // --- Persist bare filename only ---
        user.AvatarFilename = newFilename;
        user.UpdatedAt = DateTime.UtcNow;
        await _users.UpdateAsync(user);

        // --- Return the constructed public URL to the client ---
        return Ok(new { avatarUrl = newFilename });
    }

    // ── DELETE /api/avatar ────────────────────────────────────────────────────

    /// <summary>Remove the authenticated user's avatar.</summary>
    [HttpDelete]
    public async Task<IActionResult> DeleteAvatar()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _users.GetByIdAsync(userId.Value);
        if (user == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(user.AvatarFilename))
        {
            try { await _storage.DeleteFileAsync(user.AvatarFilename); }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not delete avatar for user {UserId}", userId);
            }

            user.AvatarFilename = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _users.UpdateAsync(user);
        }

        return NoContent();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private int? GetCurrentUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(raw, out var id) ? id : null;
    }
}