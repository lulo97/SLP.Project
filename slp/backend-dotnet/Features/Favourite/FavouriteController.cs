using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace backend_dotnet.Features.Favorite;

[ApiController]
[Route("api/favorites")]
public class FavoriteController : ControllerBase
{
    private readonly IFavoriteService _service;

    public FavoriteController(IFavoriteService service)
    {
        _service = service;
    }

    private int? CurrentUserId => User.Identity?.IsAuthenticated == true
        ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")
        : null;

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        var item = await _service.GetByIdAsync(id, CurrentUserId.Value);
        if (item == null) return NotFound();
        return Ok(item);
    }

    // GET /api/favorites?search=...
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();

        var items = await _service.GetUserFavoritesAsync(CurrentUserId.Value, search);
        return Ok(items);
    }

    // POST /api/favorites
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFavoriteRequest request)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();

        try
        {
            var created = await _service.CreateAsync(CurrentUserId.Value, request);
            return CreatedAtAction(nameof(GetAll), created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // PUT /api/favorites/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateFavoriteRequest request)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();

        var result = await _service.UpdateAsync(id, CurrentUserId.Value, request);
        if (result is null) return NotFound();
        return Ok(result);
    }

    // DELETE /api/favorites/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();

        var deleted = await _service.DeleteAsync(id, CurrentUserId.Value);
        if (!deleted) return NotFound();
        return NoContent();
    }
}