using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Metrics;

[Table("metrics")]
public class MetricEntry
{
    [Column("id")]
    public long Id { get; set; }

    /// <summary>"requests" | "errors" | "latency_avg" | "latency_p95"</summary>
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>UTC minute-bucket start time.</summary>
    [Column("timestamp")]
    public DateTime Timestamp { get; set; }

    [Column("value")]
    public double Value { get; set; }

    /// <summary>Reserved for future tag filtering (JSON).</summary>
    [Column("tags")]
    public string? Tags { get; set; }
}