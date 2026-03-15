using backend_dotnet.Features.Queue;
using StackExchange.Redis;
using System.Text.Json;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Queue;

public class RedisQueueService : IQueueService
{
    private readonly IConnectionMultiplexer _redis;
    private const string QueueKey = "llm_jobs";

    public RedisQueueService(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public async Task EnqueueAsync(LlmJob job)
    {
        var db = _redis.GetDatabase();
        var json = JsonSerializer.Serialize(job);
        await db.ListLeftPushAsync(QueueKey, json);
    }
}