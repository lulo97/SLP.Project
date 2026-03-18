using System.Text.Json;
using backend_dotnet.Features.Llm;

namespace backend_dotnet.Features.Queue;

public class BackgroundJobProcessor : BackgroundService
{
    private readonly IQueueService _queue;
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<BackgroundJobProcessor> _logger;

    private static readonly TimeSpan EmptyQueueDelay = TimeSpan.FromMilliseconds(500);

    // Exponential backoff: 30s, 60s, 120s for retries 1, 2, 3
    // Keeps a VPS alive during model load without hammering it.
    private static readonly TimeSpan[] RetryDelays =
    {
        TimeSpan.FromSeconds(30),
        TimeSpan.FromSeconds(60),
        TimeSpan.FromSeconds(120),
    };

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
        using var scope = _services.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<ILlmLogRepository>();
        var llmService = scope.ServiceProvider.GetRequiredService<ILlmService>();

        var log = await repo.GetByJobIdAsync(job.JobId);
        if (log is null)
        {
            _logger.LogWarning("No DB record for job {JobId}; discarding", job.JobId);
            await _queue.AcknowledgeAsync(job.JobId);
            return;
        }

        // ── Cache check BEFORE calling the LLM ───────────────────────────────
        // Always runs regardless of LlmCache:Enabled — the config flag controls
        // the controller's pre-enqueue check, but the processor must always try
        // the cache so jobs can complete while the LLM is offline.
        var cached = await repo.FindCachedAsync(job.UserId, job.RequestType, log.Prompt);
        if (cached?.Response is not null)
        {
            _logger.LogInformation(
                "Job {JobId} resolved from global cache — LLM call skipped", job.JobId);

            log.Response = cached.Response;
            log.Status = "Completed";
            log.CompletedAt = DateTime.UtcNow;
            await repo.UpdateAsync(log);
            await _queue.AcknowledgeAsync(job.JobId);
            return;
        }

        // ── Mark as Processing and call the LLM ──────────────────────────────
        log.Status = "Processing";
        await repo.UpdateAsync(log);

        try
        {
            var result = await DispatchAsync(job, llmService, ct);

            log.Response = result;
            log.Status = "Completed";
            log.CompletedAt = DateTime.UtcNow;
            await repo.UpdateAsync(log);

            // Populate global cache so future jobs resolve without hitting the LLM
            await repo.UpsertGlobalCacheAsync(log.RequestType, log.Prompt, result, log.TokensUsed);

            await _queue.AcknowledgeAsync(job.JobId);
            _logger.LogInformation("Job {JobId} completed successfully", job.JobId);
        }
        catch (Exception ex) when (IsDeserializationError(ex))
        {
            _logger.LogError(ex,
                "Job {JobId} has unrecoverable request data — marking Failed", job.JobId);
            await FailJobAsync(log, repo, job.JobId,
                $"Unrecoverable deserialization error: {ex.Message}");
        }
        catch (Exception ex)
        {
            await HandleTransientFailureAsync(job, log, repo, ex, ct);
        }
    }

    // ── Dispatch ──────────────────────────────────────────────────────────────

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
            ?? throw new JsonException(
                $"Failed to deserialize ExplainRequest for job {job.JobId}.");
        return await llmService.ProcessExplainAsync(job.UserId, request, ct);
    }

    private async Task<string> ProcessGrammarCheckAsync(
        LlmJob job, ILlmService llmService, CancellationToken ct)
    {
        var request = JsonSerializer.Deserialize<GrammarCheckRequest>(job.RequestData)
            ?? throw new JsonException(
                $"Failed to deserialize GrammarCheckRequest for job {job.JobId}.");
        return await llmService.ProcessGrammarCheckAsync(job.UserId, request, ct);
    }

    // ── Retry / failure helpers ───────────────────────────────────────────────

    private async Task HandleTransientFailureAsync(
        LlmJob job, LlmLog log, ILlmLogRepository repo, Exception ex,
        CancellationToken ct)
    {
        var maxRetries = _config.GetValue<int>("Queue:MaxRetries", 3);

        _logger.LogWarning(ex,
            "Job {JobId} failed (attempt {Attempt}/{Max})",
            job.JobId, job.RetryCount + 1, maxRetries + 1);

        if (job.RetryCount < maxRetries)
        {
            // ── Exponential backoff BEFORE re-enqueue ─────────────────────────
            // Prevents tight retry loops when the LLM is loading (HTTP 503).
            // Index is clamped so we never go out of bounds on the delays array.
            var delayIndex = Math.Min(job.RetryCount, RetryDelays.Length - 1);
            var delay = RetryDelays[delayIndex];

            _logger.LogInformation(
                "Job {JobId} will retry in {Delay}s (retry {Next}/{Max})",
                job.JobId, (int)delay.TotalSeconds, job.RetryCount + 1, maxRetries);

            // Park the DB record as Pending before sleeping so the status is
            // visible to callers polling /api/llm/job/{jobId}.
            log.Status = "Pending";
            await repo.UpdateAsync(log);

            // Sleep — this intentionally blocks the worker for the backoff
            // period.  On a small VPS with light load this is preferable to a
            // complex delayed-queue mechanism.
            try
            {
                await Task.Delay(delay, ct);
            }
            catch (OperationCanceledException)
            {
                // App is shutting down — re-enqueue so the job is not lost,
                // then let the cancellation propagate.
                job.RetryCount++;
                await _queue.AcknowledgeAsync(job.JobId);
                await _queue.EnqueueAsync(job);
                throw;
            }

            job.RetryCount++;
            await _queue.AcknowledgeAsync(job.JobId);
            await _queue.EnqueueAsync(job);

            _logger.LogInformation(
                "Job {JobId} re-queued (retry {RetryCount}/{MaxRetries})",
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

    // ── Stale-job recovery ────────────────────────────────────────────────────

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
            _logger.LogError(ex, "Error during stale-job recovery");
        }
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private static bool IsDeserializationError(Exception ex)
    {
        if (ex is JsonException) return true;
        if (ex is InvalidOperationException ioe)
        {
            return ioe.Message.Contains("deserialize", StringComparison.OrdinalIgnoreCase)
                || ioe.Message.Contains("Unknown requestType", StringComparison.OrdinalIgnoreCase);
        }
        return false;
    }
}