using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend_dotnet.Features.Search;

/// <summary>
///   GET /api/search
///
///   Full-text search across quizzes, questions, sources, and favorites.
///
///   Query parameters
///   ────────────────
///   q        (required) – search terms, min 1 character
///   type     (optional) – all | quiz | question | source | favorite (default: all)
///   page     (optional) – 1-based page index (default: 1)
///   pageSize (optional) – 1–50 items per page (default: 20)
///
///   Behaviour
///   ─────────
///   • type=all  Returns top results merged across all categories, sorted by
///               relevance rank. Pagination is effectively page 1 only; the client
///               should narrow to a specific type for deeper browsing.
///   • type=&lt;X&gt;  Returns properly paginated results for that category only.
///
///   The response includes &lt;mark&gt; tags around matched terms inside the snippet
///   field so the frontend can highlight them with a single CSS rule.
/// </summary>
[ApiController]
[Route("api/search")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly ISearchService _searchService;

    public SearchController(ISearchService searchService)
    {
        _searchService = searchService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(SearchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromQuery] string  type     = "all",
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new { error = "Query parameter 'q' is required and must not be empty." });

        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdStr is null || !int.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var request = new SearchRequest
        {
            Q        = q.Trim(),
            Type     = type,
            Page     = page,
            PageSize = pageSize,
        };

        var result = await _searchService.SearchAsync(request, userId);
        return Ok(result);
    }
}
