using StackExchange.Redis;

namespace backend_dotnet.Features.Metrics;

public class RedisMetricsCollector : IMetricsCollector
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisMetricsCollector> _logger;

    public RedisMetricsCollector(
        IConnectionMultiplexer redis,
        ILogger<RedisMetricsCollector> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task RecordRequestAsync(
        string path, string method, int statusCode, double latencyMs)
    {
        try
        {
            var db = _redis.GetDatabase();
            var bucket = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm");

            var requestKey = $"metric:requests:{bucket}";
            var latencyKey = $"metric:latency:{bucket}";

            var batch = db.CreateBatch();
            var t1 = batch.StringIncrementAsync(requestKey);
            var t2 = batch.ListRightPushAsync(latencyKey, latencyMs.ToString("F2"));

            Task? t3 = null;
            if (statusCode >= 400)
                t3 = batch.StringIncrementAsync($"metric:errors:{bucket}");

            batch.Execute();

            await Task.WhenAll(t3 is null
                ? new[] { t1, (Task)t2 }
                : new[] { t1, (Task)t2, t3 });
        }
        catch (Exception ex)
        {
            // Metrics must never crash the request pipeline
            _logger.LogWarning(ex, "Failed to push metrics to Redis");
        }
    }
}