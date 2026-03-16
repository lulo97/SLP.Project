using backend_dotnet.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.Tag;

/// <summary>
///   Tag listing and autocomplete endpoints used by the frontend tag cloud
///   and the multi-select autocomplete on quiz / question forms.
///
///   GET /api/tags               – paginated tag list with usage counts
///   GET /api/tags/popular       – top-N most-used tags (tag cloud)
///   GET /api/tags/search?q=&amp;limit= – autocomplete / name filter
/// </summary>
[ApiController]
[Route("api/tags")]
[Authorize]
public class TagController : ControllerBase
{
    private readonly AppDbContext _context;

    public TagController(AppDbContext context)
    {
        _context = context;
    }

    // ── GET /api/tags ─────────────────────────────────────────────────────────
    // Returns all tags ordered by total usage (quiz + question count).
    // Optional query params:
    //   q        – filter by name prefix / substring (case-insensitive)
    //   sort     – usage (default) | name
    //   page     – 1-based (default: 1)
    //   pageSize – 1-100 (default: 50)

    [HttpGet]
    [ProducesResponseType(typeof(TagListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTags(
        [FromQuery] string? q,
        [FromQuery] string  sort     = "usage",
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 50)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var offset = (page - 1) * pageSize;

        var baseQuery = _context.Tags
            .Select(t => new TagDto
            {
                Id            = t.Id,
                Name          = t.Name,
                QuizCount     = t.QuizTags.Count(),
                QuestionCount = t.QuestionTags.Count(),
                TotalCount    = t.QuizTags.Count() + t.QuestionTags.Count(),
            });

        // Optional name filter (for searching in the full list)
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            baseQuery = baseQuery.Where(t => t.Name.ToLower().Contains(term));
        }

        // Sorting
        baseQuery = sort.ToLowerInvariant() == "name"
            ? baseQuery.OrderBy(t => t.Name)
            : baseQuery.OrderByDescending(t => t.TotalCount).ThenBy(t => t.Name);

        var totalCount = await baseQuery.CountAsync();
        var tags       = await baseQuery.Skip(offset).Take(pageSize).ToListAsync();

        return Ok(new TagListResponse { Tags = tags, Total = totalCount });
    }

    // ── GET /api/tags/popular?limit=20 ────────────────────────────────────────
    // Convenience shortcut for the tag cloud widget:
    // returns the N most-used tags without any filter.

    [HttpGet("popular")]
    [ProducesResponseType(typeof(List<TagDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPopularTags([FromQuery] int limit = 20)
    {
        limit = Math.Clamp(limit, 1, 100);

        var tags = await _context.Tags
            .Select(t => new TagDto
            {
                Id            = t.Id,
                Name          = t.Name,
                QuizCount     = t.QuizTags.Count(),
                QuestionCount = t.QuestionTags.Count(),
                TotalCount    = t.QuizTags.Count() + t.QuestionTags.Count(),
            })
            .Where(t => t.TotalCount > 0) // only show tags actually in use
            .OrderByDescending(t => t.TotalCount)
            .ThenBy(t => t.Name)
            .Take(limit)
            .ToListAsync();

        return Ok(tags);
    }

    // ── GET /api/tags/search?q=eng&limit=10 ───────────────────────────────────
    // Autocomplete endpoint: returns tags whose name contains the query string.
    // Results are ordered by usage count so the most relevant tags surface first.
    // Designed for low-latency calls from type-ahead inputs (debounce recommended).

    [HttpGet("search")]
    [ProducesResponseType(typeof(List<TagDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SearchTags(
        [FromQuery] string? q,
        [FromQuery] int     limit = 10)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new { error = "Query parameter 'q' is required." });

        limit = Math.Clamp(limit, 1, 50);
        var term = q.Trim().ToLower();

        var tags = await _context.Tags
            .Where(t => t.Name.ToLower().Contains(term))
            .Select(t => new TagDto
            {
                Id            = t.Id,
                Name          = t.Name,
                QuizCount     = t.QuizTags.Count(),
                QuestionCount = t.QuestionTags.Count(),
                TotalCount    = t.QuizTags.Count() + t.QuestionTags.Count(),
            })
            .OrderByDescending(t => t.TotalCount)
            .ThenBy(t => t.Name)
            .Take(limit)
            .ToListAsync();

        return Ok(tags);
    }

    // ── GET /api/tags/{id} ────────────────────────────────────────────────────
    // Returns a single tag by ID (useful for resolving stored tag IDs to names).

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(TagDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTag(int id)
    {
        var tag = await _context.Tags
            .Where(t => t.Id == id)
            .Select(t => new TagDto
            {
                Id            = t.Id,
                Name          = t.Name,
                QuizCount     = t.QuizTags.Count(),
                QuestionCount = t.QuestionTags.Count(),
                TotalCount    = t.QuizTags.Count() + t.QuestionTags.Count(),
            })
            .FirstOrDefaultAsync();

        return tag is null ? NotFound() : Ok(tag);
    }
}
