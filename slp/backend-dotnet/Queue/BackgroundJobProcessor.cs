using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using backend_dotnet.Features.Llm;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using StackExchange.Redis;

namespace backend_dotnet.Features.Queue;

public class BackgroundJobProcessor : BackgroundService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IServiceProvider _services;
    private readonly ILogger<BackgroundJobProcessor> _logger;
    private readonly IConfiguration _configuration;
    private const string QueueKey = "llm_jobs";
    private const string ProcessingKey = "llm_jobs:processing";

    public BackgroundJobProcessor(
        IConnectionMultiplexer redis,
        IServiceProvider services,
        ILogger<BackgroundJobProcessor> logger,
        IConfiguration configuration)
    {
        _redis = redis;
        _services = services;
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var db = _redis.GetDatabase();

        // On startup, move any stale processing jobs back to the main queue
        await RequeueStaleJobsAsync(db);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Blocking pop from main queue, push to processing list
                var result = await db.ListRightPopLeftPushAsync(QueueKey, ProcessingKey);
                if (result.IsNull)
                {
                    await Task.Delay(1000, stoppingToken);
                    continue;
                }

                var json = result.ToString();
                var job = JsonSerializer.Deserialize<LlmJob>(json);
                if (job == null)
                {
                    _logger.LogWarning("Failed to deserialize job: {Json}", json);
                    await db.ListRemoveAsync(ProcessingKey, result); // remove invalid job
                    continue;
                }

                await ProcessJobAsync(job, stoppingToken);

                // Remove from processing list after successful processing
                await db.ListRemoveAsync(ProcessingKey, result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in background job processor");
                await Task.Delay(5000, stoppingToken);
            }
        }
    }

    private async Task RequeueStaleJobsAsync(IDatabase db)
    {
        long processingCount = db.ListLength(ProcessingKey);
        if (processingCount > 0)
        {
            _logger.LogInformation("Moving {Count} stale jobs from processing back to queue", processingCount);
            for (long i = 0; i < processingCount; i++)
            {
                // Move one item from processing to main queue
                await db.ListRightPopLeftPushAsync(ProcessingKey, QueueKey);
            }
        }
    }

    private async Task ProcessJobAsync(LlmJob job, CancellationToken cancellationToken)
    {
        using var scope = _services.CreateScope();
        var logRepository = scope.ServiceProvider.GetRequiredService<ILlmLogRepository>();
        var llmService = scope.ServiceProvider.GetRequiredService<ILlmService>();

        try
        {
            await logRepository.UpdateJobStatusAsync(job.JobId, "Processing");

            string result;
            if (job.RequestType == "explain")
            {
                var request = JsonSerializer.Deserialize<LlmExplainRequest>(job.RequestData);
                result = await llmService.ProcessExplainAsync(job.UserId, request!);
            }
            else if (job.RequestType == "grammar_check")
            {
                var request = JsonSerializer.Deserialize<LlmGrammarRequest>(job.RequestData);
                result = await llmService.ProcessGrammarCheckAsync(job.UserId, request!);
            }
            else
            {
                throw new InvalidOperationException($"Unknown request type: {job.RequestType}");
            }

            await logRepository.UpdateJobStatusAsync(job.JobId, "Completed", result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Job {JobId} failed", job.JobId);

            // Retry logic
            int maxRetries = _configuration.GetValue<int>("Queue:MaxRetries", 3);
            if (job.RetryCount < maxRetries)
            {
                job.RetryCount++;
                var db = _redis.GetDatabase();
                var json = JsonSerializer.Serialize(job);
                await db.ListLeftPushAsync(QueueKey, json); // re-enqueue at front
                _logger.LogWarning("Re-enqueued job {JobId} (retry {RetryCount}/{MaxRetries})",
                    job.JobId, job.RetryCount, maxRetries);
            }
            else
            {
                await logRepository.UpdateJobStatusAsync(job.JobId, "Failed");
            }
        }
    }
}