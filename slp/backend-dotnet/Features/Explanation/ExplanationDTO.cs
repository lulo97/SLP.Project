namespace backend_dotnet.Features.Explanation;

// ── DTOs ────────────────────────────────────────────────────────────────────

public class ExplanationDto
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public int SourceId { get; set; }
    public object? TextRange { get; set; }
    public string Content { get; set; } = string.Empty;
    public string AuthorType { get; set; } = "user";
    public bool Editable { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

// ── Requests ─────────────────────────────────────────────────────────────────

public class CreateExplanationRequest
{
    public int SourceId { get; set; }

    /// <summary>
    /// Arbitrary JSON-serialisable object that describes the text range
    /// (e.g. { "start": 0, "end": 42 }).  Stored as JSONB in PostgreSQL.
    /// </summary>
    public object? TextRange { get; set; }

    public string Content { get; set; } = string.Empty;
}

public class UpdateExplanationRequest
{
    public string Content { get; set; } = string.Empty;
}