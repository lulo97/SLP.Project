using System.Threading.Tasks;

namespace backend_dotnet.Features.Llm;

public interface ILlmLogRepository
{
    Task<LlmLog?> GetCachedResponseAsync(int userId, string requestType, string prompt);
    Task AddAsync(LlmLog log);
}