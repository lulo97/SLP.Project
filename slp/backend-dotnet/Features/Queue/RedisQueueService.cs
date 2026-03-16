using System.Text.Json;
using StackExchange.Redis;

namespace backend_dotnet.Features.Queue;

/// <summary>
/// Redis-backed queue that uses three keys per job:
/// <list type="bullet">
///   <item><c>llm:queue:pending</c>   — list of jobId strings awaiting processing</item>
///   <item><c>llm:queue:processing</c> — list of jobId strings currently in flight</item>
///   <item><c>llm:job:{jobId}</c>     — JSON blob of the full <see cref="LlmJob"/></item>
/// </list>
/// RPOPLPUSH atomically moves a jobId from pending → processing, ensuring no job
/// is lost if the worker crashes between dequeue and acknowledge.
/// </summary>
public class RedisQueueService : IQueueService
{
    private const string PendingKey    = "llm:queue:pending";
    private const string ProcessingKey = "llm:queue:processing";
    private static string JobDataKey(string jobId) => $"llm:job:{jobId}";

    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisQueueService> _logger;

    public RedisQueueService(IConnectionMultiplexer redis, ILogger<RedisQueueService> logger)
    {
        _redis  = redis;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task EnqueueAsync(LlmJob job)
    {
        var db  = _redis.GetDatabase();
        var json = JsonSerializer.Serialize(job);

        // Store full job data — TTL 7 days to self-clean old jobs
        await db.StringSetAsync(JobDataKey(job.JobId), json, TimeSpan.FromDays(7));

        // Push jobId onto left end of pending list
        await db.ListLeftPushAsync(PendingKey, job.JobId);

        _logger.LogDebug("Enqueued job {JobId} ({RequestType})", job.JobId, job.RequestType);
    }

    /// <inheritdoc/>
    public async Task<LlmJob?> DequeueAsync(CancellationToken ct = default)
    {
        var db = _redis.GetDatabase();

        // Atomically move one jobId from right of pending → left of processing
        var jobIdValue = await db.ListRightPopLeftPushAsync(PendingKey, ProcessingKey);
        if (jobIdValue.IsNullOrEmpty)
            return null;

        var jobId = jobIdValue.ToString();

        var jobJson = await db.StringGetAsync(JobDataKey(jobId));
        if (jobJson.IsNullOrEmpty)
        {
            // Orphaned entry — clean up processing queue
            _logger.LogWarning("Job data missing for jobId {JobId}; removing from processing queue", jobId);
            await db.ListRemoveAsync(ProcessingKey, jobIdValue);
            return null;
        }

        return JsonSerializer.Deserialize<LlmJob>(jobJson.ToString());
    }

    /// <inheritdoc/>
    public async Task AcknowledgeAsync(string jobId)
    {
        var db = _redis.GetDatabase();
        var removed = await db.ListRemoveAsync(ProcessingKey, jobId);
        _logger.LogDebug("Acknowledged job {JobId} (removed {Count} entries)", jobId, removed);
    }

    /// <inheritdoc/>
    public async Task<List<string>> GetProcessingJobIdsAsync()
    {
        var db     = _redis.GetDatabase();
        var values = await db.ListRangeAsync(ProcessingKey);
        return values.Select(v => v.ToString()).ToList();
    }

    /// <inheritdoc/>
    public async Task RequeueStaleAsync(string jobId)
    {
        var db = _redis.GetDatabase();

        // Remove from processing list
        await db.ListRemoveAsync(ProcessingKey, jobId);

        // Push back to pending
        await db.ListLeftPushAsync(PendingKey, jobId);

        _logger.LogInformation("Stale job {JobId} moved back to pending queue", jobId);
    }
}
