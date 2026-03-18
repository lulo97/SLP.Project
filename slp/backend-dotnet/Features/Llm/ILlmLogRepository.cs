namespace backend_dotnet.Features.Llm;

public interface ILlmLogRepository
{
    /// <summary>
    /// Find a cached completed log for the given prompt.
    /// Lookup order:
    ///   1. User-specific row  (user_id = userId, status = Completed)
    ///   2. Global cache row   (user_id IS NULL,  status = Completed)
    /// Returns null when no cache hit exists.
    /// </summary>
    Task<LlmLog?> FindCachedAsync(int? userId, string requestType, string prompt);

    /// <summary>
    /// Insert or update the global cache row (user_id IS NULL) for this
    /// (requestType, prompt) pair.  Called after every successful LLM call so
    /// subsequent users with the same prompt avoid hitting the model.
    /// Safe to call concurrently — conflicts on the unique index are silently ignored.
    /// </summary>
    Task UpsertGlobalCacheAsync(string requestType, string prompt, string response, int? tokensUsed);

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