using System.Threading.Tasks;

namespace backend_dotnet.Features.Llm;

public interface ILlmService
{
    Task<string> ExplainAsync(int userId, LlmExplainRequest request);
    Task<string> GrammarCheckAsync(int userId, LlmGrammarRequest request);

    // Methods for background processing
    Task<string> ProcessExplainAsync(int userId, LlmExplainRequest request);
    Task<string> ProcessGrammarCheckAsync(int userId, LlmGrammarRequest request);
}