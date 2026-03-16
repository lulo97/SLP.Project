namespace backend_dotnet.Features.Llm;

public interface ILlmLogRepository
{
    /// <summary>
    /// Find the most recent completed log with the same userId + requestType + prompt.
    /// Returns null if no cache hit exists.
    /// </summary>
    Task<LlmLog?> FindCachedAsync(int? userId, string requestType, string prompt);

    /// <summary>Persist a new log row and return it (Id populated).</summary>
    Task<LlmLog> CreateAsync(LlmLog log);

    /// <summary>Persist changes to an existing log row.</summary>
    Task UpdateAsync(LlmLog log);

    /// <summary>Look up a log by its job ID.</summary>
    Task<LlmLog?> GetByJobIdAsync(string jobId);

    /// <summary>
    /// Return all logs whose status is "Processing" —
    /// used on startup to recover jobs that were interrupted.
    /// </summary>
    Task<List<LlmLog>> GetStaleProcessingLogsAsync();
}
