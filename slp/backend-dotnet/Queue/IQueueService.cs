using System.Threading.Tasks;

namespace backend_dotnet.Features.Queue;

public interface IQueueService
{
    Task EnqueueAsync(LlmJob job);
}