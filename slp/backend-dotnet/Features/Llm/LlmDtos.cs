using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.Features.Llm;

// ── Inbound requests ──────────────────────────────────────────────────────────

public class ExplainRequest
{
    [Required]
    public int SourceId { get; set; }

    [Required]
    [MinLength(1)]
    [MaxLength(5000)]
    public string SelectedText { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Context { get; set; }
}

public class GrammarCheckRequest
{
    [Required]
    [MinLength(1)]
    [MaxLength(5000)]
    public string Text { get; set; } = string.Empty;
}

// ── Outbound responses ────────────────────────────────────────────────────────

/// <summary>Returned synchronously when the queue is disabled.</summary>
public class SyncLlmResponse
{
    public string Result { get; init; } = string.Empty;
}

/// <summary>Returned with HTTP 202 when the queue is enabled.</summary>
public class AsyncLlmResponse
{
    public string JobId { get; init; } = string.Empty;
    public string Status { get; init; } = "Pending";
}

/// <summary>Returned from GET /job/{jobId}.</summary>
public class JobStatusResponse
{
    public string JobId { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string? Result { get; init; }
    public string? Error { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
}
