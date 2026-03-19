using backend_dotnet.Data;
using StackExchange.Redis;

namespace backend_dotnet.Features.Metrics;

/// <summary>
/// Runs every minute. Reads completed minute-buckets from Redis,
/// computes aggregates, persists to PostgreSQL, then deletes the raw keys.
/// </summary>
public class MetricsFlushService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<MetricsFlushService> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    public MetricsFlushService(
        IServiceScopeFactory scopeFactory,
        IConnectionMultiplexer redis,
        ILogger<MetricsFlushService> logger)
    {
        _scopeFactory = scopeFactory;
        _redis = redis;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MetricsFlushService started");

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(Interval, stoppingToken);
            try { await FlushAsync(); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MetricsFlushService: unhandled error during flush");
            }
        }
    }

    private async Task FlushAsync()
    {
        var db = _redis.GetDatabase();
        var server = _redis.GetServer(_redis.GetEndPoints().First());

        // Only flush buckets that are no longer the active minute
        var activeBucket = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm");
        var entries = new List<MetricEntry>();

        // ── Requests ─────────────────────────────────────────────────────────
        foreach (var key in server.Keys(pattern: "metric:requests:*"))
        {
            var bucket = key.ToString().Replace("metric:requests:", "");
            if (bucket == activeBucket) continue;

            var raw = await db.StringGetAsync(key);
            if (raw.HasValue && long.TryParse((string?)raw, out var count))
                entries.Add(MakeEntry("requests", bucket, count));

            await db.KeyDeleteAsync(key);
        }

        // ── Errors ───────────────────────────────────────────────────────────
        foreach (var key in server.Keys(pattern: "metric:errors:*"))
        {
            var bucket = key.ToString().Replace("metric:errors:", "");
            if (bucket == activeBucket) continue;

            var raw = await db.StringGetAsync(key);
            if (raw.HasValue && long.TryParse((string?)raw, out var count))
                entries.Add(MakeEntry("errors", bucket, count));

            await db.KeyDeleteAsync(key);
        }

        // ── Latency ──────────────────────────────────────────────────────────
        foreach (var key in server.Keys(pattern: "metric:latency:*"))
        {
            var bucket = key.ToString().Replace("metric:latency:", "");
            if (bucket == activeBucket) continue;

            var rawValues = await db.ListRangeAsync(key);
            var sorted = rawValues
                .Select(v => double.TryParse((string?)v, out var d) ? (double?)d : null)
                .Where(v => v.HasValue)
                .Select(v => v!.Value)
                .OrderBy(v => v)
                .ToList();

            if (sorted.Count > 0)
            {
                var ts = ParseBucket(bucket);
                var p95Idx = Math.Max(0, (int)Math.Ceiling(0.95 * sorted.Count) - 1);

                entries.Add(new MetricEntry { Name = "latency_avg", Timestamp = ts, Value = sorted.Average() });
                entries.Add(new MetricEntry { Name = "latency_p95", Timestamp = ts, Value = sorted[p95Idx] });
            }

            await db.KeyDeleteAsync(key);
        }

        if (entries.Count == 0) return;

        using var scope = _scopeFactory.CreateScope();
        var appDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        appDb.Metrics.AddRange(entries);
        await appDb.SaveChangesAsync();

        _logger.LogInformation(
            "MetricsFlushService: flushed {Count} entries to PostgreSQL", entries.Count);
    }

    private static MetricEntry MakeEntry(string name, string bucket, double value) =>
        new() { Name = name, Timestamp = ParseBucket(bucket), Value = value };

    private static DateTime ParseBucket(string bucket) =>
        DateTime.Parse(bucket,
            null,
            System.Globalization.DateTimeStyles.AssumeUniversal).ToUniversalTime();
}