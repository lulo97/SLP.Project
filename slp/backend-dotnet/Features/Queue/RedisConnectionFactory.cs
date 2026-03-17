using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace backend_dotnet.Features.Queue;

public class RedisConnectionFactory
{
    private readonly Lazy<IConnectionMultiplexer?> _lazyConnection;
    private readonly ILogger<RedisConnectionFactory> _logger;

    public RedisConnectionFactory(string connectionString, ILogger<RedisConnectionFactory> logger)
    {
        _logger = logger;
        _lazyConnection = new Lazy<IConnectionMultiplexer?>(() =>
        {
            if (string.IsNullOrEmpty(connectionString))
            {
                _logger.LogWarning("Redis connection string is missing or empty.");
                return null;
            }

            try
            {
                return ConnectionMultiplexer.Connect(connectionString);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to connect to Redis. Queue service will operate in degraded mode.");
                return null;
            }
        });
    }

    public IConnectionMultiplexer? Connection => _lazyConnection.Value;
}