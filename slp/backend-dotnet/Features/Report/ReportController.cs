using backend_dotnet.Features.Report;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace backend_dotnet.Features.Report;

[ApiController]
[Route("api/reports")]
public class ReportController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [Authorize(Roles = "admin")]
    [HttpGet]
    public async Task<IActionResult> GetUnresolved(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? 20 : (pageSize > 100 ? 100 : pageSize);
        var result = await _reportService.GetUnresolvedAsync(search, page, pageSize);
        return Ok(result);
    }

    [Authorize(Roles = "admin")]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var report = await _reportService.GetByIdAsync(id);
        if (report == null) return NotFound();
        return Ok(report);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReportRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await _reportService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = report.Id }, report);
    }

    [Authorize(Roles = "admin")]
    [HttpPost("{id}/resolve")]
    public async Task<IActionResult> Resolve(int id)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var resolved = await _reportService.ResolveAsync(adminId, id);
        if (!resolved) return NotFound();
        return Ok();
    }

    [Authorize]
    [HttpGet("mine")]
    public async Task<IActionResult> GetMyReports()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var reports = await _reportService.GetByUserIdAsync(userId);
        return Ok(reports);
    }

    [Authorize]
    [HttpDelete("mine/{id}")]
    public async Task<IActionResult> DeleteMyReport(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await _reportService.GetByIdAsync(id);
        if (report == null || report.UserId != userId) return NotFound();
        if (report.Resolved) return Conflict(new { message = "Cannot delete a resolved report." });

        var deleted = await _reportService.DeleteAsync(userId, id);
        if (!deleted) return NotFound();
        return NoContent();
    }
}