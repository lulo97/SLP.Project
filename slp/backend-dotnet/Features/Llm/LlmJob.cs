namespace backend_dotnet.Features.Queue;

/// <summary>Represents a unit of work placed on the LLM processing queue.</summary>
public class LlmJob
{
    /// <summary>Unique identifier (GUID string). Also the DB log's job_id.</summary>
    public string JobId { get; set; } = string.Empty;

    public int? UserId { get; set; }

    /// <summary>e.g. "explain" | "grammar_check"</summary>
    public string RequestType { get; set; } = string.Empty;

    /// <summary>JSON-serialized request object (ExplainRequest / GrammarCheckRequest).</summary>
    public string RequestData { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>How many times this job has been attempted after the initial try.</summary>
    public int RetryCount { get; set; } = 0;
}
