namespace backend_dotnet.Features.Queue;

public interface IQueueService
{
    /// <summary>
    /// Serialize <paramref name="job"/> and push it onto the pending queue.
    /// Also stores job data in Redis under a per-job key so it survives
    /// the dequeue → processing move.
    /// </summary>
    Task EnqueueAsync(LlmJob job);

    /// <summary>
    /// Atomically pop one job from the pending queue and push it to the
    /// processing queue (RPOPLPUSH).
    /// Returns <c>null</c> immediately when the queue is empty.
    /// </summary>
    Task<LlmJob?> DequeueAsync(CancellationToken ct = default);

    /// <summary>
    /// Remove the job from the processing queue once it has been
    /// handled (successfully or permanently failed).
    /// </summary>
    Task AcknowledgeAsync(string jobId);

    /// <summary>
    /// Returns the job IDs currently sitting in the processing queue.
    /// Used on startup to recover jobs that were interrupted mid-flight.
    /// </summary>
    Task<List<string>> GetProcessingJobIdsAsync();

    /// <summary>
    /// Move a stale job ID from the processing queue back to the pending
    /// queue so it can be retried by the background processor.
    /// </summary>
    Task RequeueStaleAsync(string jobId);

    /// <summary>Indicates whether the queue is operational (e.g., Redis connected).</summary>
    bool IsAvailable { get; }
}