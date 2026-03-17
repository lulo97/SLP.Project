namespace backend_dotnet.Features.Queue;

/// <summary>
/// No-op implementation of <see cref="IQueueService"/>.
/// Registered when <c>Queue:Enabled</c> is <c>false</c>;
/// the controller falls through to synchronous processing in that case
/// and never calls these methods.
/// </summary>
public class NullQueueService : IQueueService
{
    public bool IsAvailable => false;

    public Task EnqueueAsync(LlmJob job) =>
        throw new InvalidOperationException(
            "Queue is disabled. Set Queue:Enabled = true in configuration to use async processing.");

    public Task<LlmJob?> DequeueAsync(CancellationToken ct = default) =>
        Task.FromResult<LlmJob?>(null);

    public Task AcknowledgeAsync(string jobId) => Task.CompletedTask;

    public Task<List<string>> GetProcessingJobIdsAsync() =>
        Task.FromResult(new List<string>());

    public Task RequeueStaleAsync(string jobId) => Task.CompletedTask;
}