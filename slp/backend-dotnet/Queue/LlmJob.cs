using System;

namespace backend_dotnet.Features.Queue;

public class LlmJob
{
    public string JobId { get; set; } = Guid.NewGuid().ToString();
    public int UserId { get; set; }
    public string RequestType { get; set; } = string.Empty; // "explain" or "grammar_check"
    public string RequestData { get; set; } = string.Empty; // JSON of the specific request
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // New: for retry logic
    public int RetryCount { get; set; } = 0;
}