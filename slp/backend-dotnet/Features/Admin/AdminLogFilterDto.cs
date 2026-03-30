using System;

namespace backend_dotnet.Features.Admin;

public class AdminLogFilterDto
{
    public string? Search { get; set; }          // free‑text search
    public string? Action { get; set; }          // exact match
    public string? TargetType { get; set; }      // exact match
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int? AdminId { get; set; }            // kept for future use, but not used by frontend
    public int? Count { get; set; } = 100;       // max number of logs to return
}