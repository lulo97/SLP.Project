using System.Text.Json;
using backend_dotnet.Features.Llm;

namespace backend_dotnet.Features.Queue;

/// <summary>
/// Long-running <see cref="BackgroundService"/> that continuously polls the
/// Redis queue, processes LLM jobs, and updates the database log accordingly.
///
/// On startup it recovers any jobs that were left in "Processing" state
/// (e.g. due to a previous crash) by resetting them to "Pending" and
/// re-enqueuing their IDs.
/// </summary>
public class BackgroundJobProcessor : BackgroundService
{
    private readonly IQueueService _queue;
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<BackgroundJobProcessor> _logger;

    // How long to wait when the queue is empty before polling again
    private static readonly TimeSpan EmptyQueueDelay = TimeSpan.FromMilliseconds(500);

    public BackgroundJobProcessor(
        IQueueService queue,
        IServiceProvider services,
        IConfiguration config,
        ILogger<BackgroundJobProcessor> logger)
    {
        _queue = queue;
        _services = services;
        _config = config;
        _logger = logger;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("BackgroundJobProcessor starting");

        await RecoverStaleJobsAsync();

        _logger.LogInformation("BackgroundJobProcessor is ready — polling queue");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var job = await _queue.DequeueAsync(stoppingToken);

                if (job is null)
                {
                    await Task.Delay(EmptyQueueDelay, stoppingToken);
                    continue;
                }

                _logger.LogInformation(
                    "Dequeued job {JobId} (type={RequestType}, retry={RetryCount})",
                    job.JobId, job.RequestType, job.RetryCount);

                await ProcessJobAsync(job, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Normal shutdown
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in BackgroundJobProcessor main loop");
                await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            }
        }

        _logger.LogInformation("BackgroundJobProcessor stopped");
    }

    // ── Core job processing ───────────────────────────────────────────────────

    private async Task ProcessJobAsync(LlmJob job, CancellationToken ct)
    {
        // Each job gets its own DI scope so scoped services (EF DbContext) are
        // properly isolated and disposed after the job finishes.
        using var scope = _services.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<ILlmLogRepository>();
        var llmService = scope.ServiceProvider.GetRequiredService<ILlmService>();

        // ── Verify DB record still exists ────────────────────────────────────
        var log = await repo.GetByJobIdAsync(job.JobId);
        if (log is null)
        {
            _logger.LogWarning("No DB record for job {JobId}; discarding", job.JobId);
            await _queue.AcknowledgeAsync(job.JobId);
            return;
        }

        // ── Mark Processing ──────────────────────────────────────────────────
        log.Status = "Processing";
        await repo.UpdateAsync(log);

        // ── Execute ──────────────────────────────────────────────────────────
        try
        {
            var result = await DispatchAsync(job, llmService, ct);

            log.Response = result;
            log.Status = "Completed";
            log.CompletedAt = DateTime.UtcNow;
            await repo.UpdateAsync(log);
            await _queue.AcknowledgeAsync(job.JobId);

            _logger.LogInformation("Job {JobId} completed successfully", job.JobId);
        }
        catch (Exception ex) when (IsDeserializationError(ex))
        {
            // Unrecoverable — bad request data, no point retrying
            _logger.LogError(ex, "Job {JobId} has unrecoverable request data — marking Failed", job.JobId);
            await FailJobAsync(log, repo, job.JobId, $"Unrecoverable deserialization error: {ex.Message}");
        }
        catch (Exception ex)
        {
            await HandleTransientFailureAsync(job, log, repo, ex);
        }
    }

    // ── Dispatch to the right service method ─────────────────────────────────

    private async Task<string> DispatchAsync(
        LlmJob job, ILlmService llmService, CancellationToken ct)
    {
        return job.RequestType switch
        {
            "explain" => await ProcessExplainAsync(job, llmService, ct),
            "grammar_check" => await ProcessGrammarCheckAsync(job, llmService, ct),
            _ => throw new InvalidOperationException(
                     $"Unknown requestType '{job.RequestType}' for job {job.JobId}.")
        };
    }

    private async Task<string> ProcessExplainAsync(
        LlmJob job, ILlmService llmService, CancellationToken ct)
    {
        var request = JsonSerializer.Deserialize<ExplainRequest>(job.RequestData)
            ?? throw new JsonException($"Failed to deserialize ExplainRequest for job {job.JobId}.");

        return await llmService.ProcessExplainAsync(job.UserId, request, ct);
    }

    private async Task<string> ProcessGrammarCheckAsync(
        LlmJob job, ILlmService llmService, CancellationToken ct)
    {
        var request = JsonSerializer.Deserialize<GrammarCheckRequest>(job.RequestData)
            ?? throw new JsonException($"Failed to deserialize GrammarCheckRequest for job {job.JobId}.");

        return await llmService.ProcessGrammarCheckAsync(job.UserId, request, ct);
    }

    // ── Retry / failure helpers ───────────────────────────────────────────────

    private async Task HandleTransientFailureAsync(
        LlmJob job, LlmLog log, ILlmLogRepository repo, Exception ex)
    {
        var maxRetries = _config.GetValue<int>("Queue:MaxRetries", 3);

        _logger.LogWarning(ex,
            "Job {JobId} failed (attempt {Attempt}/{Max})",
            job.JobId, job.RetryCount + 1, maxRetries + 1);

        if (job.RetryCount < maxRetries)
        {
            job.RetryCount++;

            // Ack the current processing entry, then re-enqueue with updated retry count
            await _queue.AcknowledgeAsync(job.JobId);
            await _queue.EnqueueAsync(job);

            log.Status = "Pending";
            await repo.UpdateAsync(log);

            _logger.LogInformation(
                "Job {JobId} re-queued for retry {RetryCount}/{MaxRetries}",
                job.JobId, job.RetryCount, maxRetries);
        }
        else
        {
            _logger.LogError(
                "Job {JobId} permanently failed after {MaxRetries} retries",
                job.JobId, maxRetries);

            await FailJobAsync(log, repo, job.JobId, ex.Message);
        }
    }

    private async Task FailJobAsync(
        LlmLog log, ILlmLogRepository repo, string jobId, string errorMessage)
    {
        log.Status = "Failed";
        log.Error = errorMessage;
        log.CompletedAt = DateTime.UtcNow;
        await repo.UpdateAsync(log);
        await _queue.AcknowledgeAsync(jobId);
    }

    // ── Stale-job recovery on startup ─────────────────────────────────────────

    /// <summary>
    /// On restart, any jobs left in "Processing" in both the DB and the
    /// Redis processing queue are moved back to "Pending" and re-enqueued.
    /// </summary>
    private async Task RecoverStaleJobsAsync()
    {
        try
        {
            var staleIds = await _queue.GetProcessingJobIdsAsync();
            if (staleIds.Count == 0)
            {
                _logger.LogDebug("No stale jobs to recover");
                return;
            }

            _logger.LogWarning("Recovering {Count} stale job(s) from previous run", staleIds.Count);

            using var scope = _services.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<ILlmLogRepository>();

            foreach (var jobId in staleIds)
            {
                var log = await repo.GetByJobIdAsync(jobId);
                if (log is not null)
                {
                    log.Status = "Pending";
                    await repo.UpdateAsync(log);
                }

                await _queue.RequeueStaleAsync(jobId);
                _logger.LogInformation("Recovered stale job {JobId}", jobId);
            }
        }
        catch (Exception ex)
        {
            // Non-fatal — log and continue startup
            _logger.LogError(ex, "Error during stale-job recovery");
        }
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns true for errors caused by bad request data that cannot be fixed by
    /// retrying — JSON parse failures and unknown request type errors.
    /// These are caught first so the job is failed immediately without retry.
    /// </summary>
    private static bool IsDeserializationError(Exception ex)
    {
        if (ex is JsonException)
            return true;

        if (ex is InvalidOperationException ioe)
        {
            return ioe.Message.Contains("deserialize", StringComparison.OrdinalIgnoreCase)
                || ioe.Message.Contains("Unknown requestType", StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }
}