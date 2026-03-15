namespace backend_dotnet.Features.Progress;

public class ProgressDto
{
    public int SourceId { get; set; }
    public object? LastPosition { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpdateProgressRequest
{
    /// <summary>
    /// Any JSON-serializable object describing the reading position.
    /// Recommended shape: { scrollTop: number, scrollPercent: number, paragraphIndex: number }
    /// </summary>
    public object LastPosition { get; set; } = new { };
}