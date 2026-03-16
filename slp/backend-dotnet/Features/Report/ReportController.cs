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
    public async Task<IActionResult> GetUnresolved()
    {
        var reports = await _reportService.GetUnresolvedAsync();
        return Ok(reports);
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
}