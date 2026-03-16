namespace backend_dotnet.Features.Llm;

public interface ILlmService
{
    /// <summary>Build the prompt string for an explain request.</summary>
    string BuildExplainPrompt(ExplainRequest request);

    /// <summary>Build the prompt string for a grammar-check request.</summary>
    string BuildGrammarCheckPrompt(GrammarCheckRequest request);

    /// <summary>
    /// Send <paramref name="prompt"/> to the LLM API and return the raw text response.
    /// No caching or logging — callers handle that.
    /// </summary>
    Task<(string Content, int? TokensUsed)> CallLlmAsync(string prompt, CancellationToken ct = default);

    // Convenience wrappers used by BackgroundJobProcessor
    Task<string> ProcessExplainAsync(int? userId, ExplainRequest request, CancellationToken ct = default);
    Task<string> ProcessGrammarCheckAsync(int? userId, GrammarCheckRequest request, CancellationToken ct = default);
}
