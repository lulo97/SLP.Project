using StackExchange.Redis;

namespace backend_dotnet.Features.Metrics;

public class RedisMetricsCollector : IMetricsCollector
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisMetricsCollector> _logger;
    private readonly CircuitBreaker _circuitBreaker;

    public RedisMetricsCollector(
        IConnectionMultiplexer redis,
        ILogger<RedisMetricsCollector> logger)
    {
        _redis = redis;
        _logger = logger;
        _circuitBreaker = new CircuitBreaker(5, TimeSpan.FromMinutes(1), logger);
    }

    public async Task RecordRequestAsync(
        string path, string method, int statusCode, double latencyMs)
    {
        // Kiểm tra circuit breaker trước khi thực hiện
        if (!_circuitBreaker.AllowRequest())
        {
            _logger.LogDebug("Metrics circuit is open, skipping record.");
            return;
        }

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

            // Thành công: reset circuit breaker
            _circuitBreaker.RecordSuccess();
        }
        catch (Exception ex)
        {
            // Metrics must never crash the request pipeline
            _logger.LogWarning(ex, "Failed to push metrics to Redis");

            // Ghi nhận thất bại để circuit breaker tính toán
            _circuitBreaker.RecordFailure();
        }
    }

    // Lớp circuit breaker nội bộ
    private class CircuitBreaker
    {
        private readonly int _failureThreshold;
        private readonly TimeSpan _cooldown;
        private readonly ILogger _logger;

        private int _failureCount;
        private DateTime _lastFailureTime;
        private readonly object _lock = new object();
        private bool _isOpen;

        public CircuitBreaker(int failureThreshold, TimeSpan cooldown, ILogger logger)
        {
            _failureThreshold = failureThreshold;
            _cooldown = cooldown;
            _logger = logger;
        }

        public bool AllowRequest()
        {
            lock (_lock)
            {
                if (!_isOpen)
                    return true;

                // Sau thời gian cooldown, chuyển sang trạng thái nửa mở (half-open)
                if (DateTime.UtcNow - _lastFailureTime > _cooldown)
                {
                    _isOpen = false;
                    _failureCount = 0;
                    _logger.LogInformation("Metrics circuit closed (recovered).");
                    return true;
                }

                return false;
            }
        }

        public void RecordSuccess()
        {
            lock (_lock)
            {
                _failureCount = 0;
                if (_isOpen)
                {
                    _isOpen = false;
                    _logger.LogInformation("Metrics circuit closed after success.");
                }
            }
        }

        public void RecordFailure()
        {
            lock (_lock)
            {
                if (_isOpen)
                    return;

                _failureCount++;
                _lastFailureTime = DateTime.UtcNow;

                if (_failureCount >= _failureThreshold)
                {
                    _isOpen = true;
                    _logger.LogWarning("Metrics circuit opened after {FailureCount} consecutive failures.", _failureCount);
                }
            }
        }
    }
}