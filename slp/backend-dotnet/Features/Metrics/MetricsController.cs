using backend_dotnet.Data;
using backend_dotnet.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace backend_dotnet.Features.Metrics;

[ApiController]
[Route("api/admin/metrics")]
[Authorize]
public class MetricsController : ControllerBase
{
    private readonly AppDbContext _db;

    public MetricsController(AppDbContext db) => _db = db;

    // GET /api/admin/metrics/requests?from=&to=&interval=
    [HttpGet("requests")]
    public Task<IActionResult> GetRequests(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] string interval = "minute")
        => GetSimpleMetricAsync("requests", from, to);

    // GET /api/admin/metrics/errors?from=&to=&interval=
    [HttpGet("errors")]
    public Task<IActionResult> GetErrors(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] string interval = "minute")
        => GetSimpleMetricAsync("errors", from, to);

    // GET /api/admin/metrics/latency?from=&to=&interval=
    [HttpGet("latency")]
    public async Task<IActionResult> GetLatency(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] string interval = "minute")
    {
        if (!IsAdmin()) return Forbid();

        var (start, end) = Range(from, to);

        var rows = await _db.Metrics
            .Where(m =>
                (m.Name == "latency_p95" || m.Name == "latency_avg") &&
                m.Timestamp >= start && m.Timestamp <= end)
            .OrderBy(m => m.Timestamp)
            .ToListAsync();

        var result = rows
            .GroupBy(m => m.Timestamp)
            .Select(g => new
            {
                timestamp = g.Key,
                avg = g.FirstOrDefault(x => x.Name == "latency_avg")?.Value,
                p95 = g.FirstOrDefault(x => x.Name == "latency_p95")?.Value,
            });

        return Ok(result);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<IActionResult> GetSimpleMetricAsync(
        string name, DateTime? from, DateTime? to)
    {
        if (!IsAdmin()) return Forbid();

        var (start, end) = Range(from, to);

        var rows = await _db.Metrics
            .Where(m => m.Name == name && m.Timestamp >= start && m.Timestamp <= end)
            .OrderBy(m => m.Timestamp)
            .Select(m => new { m.Timestamp, m.Value })
            .ToListAsync();

        return Ok(rows);
    }

    private bool IsAdmin()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(raw, out var id) && AdminHelper.IsAdmin(id);
    }

    private static (DateTime start, DateTime end) Range(DateTime? from, DateTime? to)
    {
        var end = (to ?? DateTime.UtcNow).ToUniversalTime();
        var start = (from ?? end.AddHours(-24)).ToUniversalTime();
        return (start, end);
    }
}