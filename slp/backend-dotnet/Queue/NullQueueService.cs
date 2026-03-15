using backend_dotnet.Features.Queue;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Queue;

// No-op implementation when queue is disabled
public class NullQueueService : IQueueService
{
    public Task EnqueueAsync(LlmJob job) => Task.CompletedTask;
}