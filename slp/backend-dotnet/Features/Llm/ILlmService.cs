using System.Threading.Tasks;

namespace backend_dotnet.Features.Llm;

public interface ILlmService
{
    Task<string> ExplainAsync(int userId, LlmExplainRequest request);
    Task<string> GrammarCheckAsync(int userId, LlmGrammarRequest request);
}