using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace backend_dotnet.Features.Llm;

public class LlmService : ILlmService
{
    private readonly ILlmLogRepository _logRepository;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<LlmService> _logger;

    // System prompts for each task
    private static class Prompts
    {
        public const string Explain =
            "You are a helpful assistant. Explain the following text in simple, clear terms. " +
            "Provide only the explanation without additional commentary.";

        public const string GrammarCheck =
            "You are a grammar assistant. Correct the following text for grammar, spelling, and punctuation. " +
            "Return only the corrected text, no explanations.";
    }

    public LlmService(
        ILlmLogRepository logRepository,
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<LlmService> logger)
    {
        _logRepository = logRepository;
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<string> ExplainAsync(int userId, LlmExplainRequest request)
    {
        // Build the full prompt (system + user)
        var userPrompt = request.SelectedText;
        if (!string.IsNullOrWhiteSpace(request.Context))
        {
            userPrompt = $"Context: {request.Context}\n\nText to explain: {request.SelectedText}";
        }
        var fullPrompt = $"{Prompts.Explain}\n\n{userPrompt}";

        // 1. Check cache
        var cached = await _logRepository.GetCachedResponseAsync(userId, "explain", fullPrompt);
        if (cached != null)
        {
            _logger.LogInformation("Cache hit for explain, user={UserId}", userId);
            return cached.Response!;
        }

        // 2. Call LLM API
        var responseContent = await CallLlmApi(fullPrompt);

        // 3. Store in database
        var logEntry = new LlmLog
        {
            UserId = userId,
            RequestType = "explain",
            Prompt = fullPrompt,
            Response = responseContent,
            CreatedAt = DateTime.UtcNow
        };
        await _logRepository.AddAsync(logEntry);

        return responseContent;
    }

    public async Task<string> GrammarCheckAsync(int userId, LlmGrammarRequest request)
    {
        var fullPrompt = $"{Prompts.GrammarCheck}\n\n{request.Text}";

        // Check cache
        var cached = await _logRepository.GetCachedResponseAsync(userId, "grammar_check", fullPrompt);
        if (cached != null)
        {
            _logger.LogInformation("Cache hit for grammar-check, user={UserId}", userId);
            return cached.Response!;
        }

        // Call LLM API
        var responseContent = await CallLlmApi(fullPrompt);

        // Store in database
        var logEntry = new LlmLog
        {
            UserId = userId,
            RequestType = "grammar_check",
            Prompt = fullPrompt,
            Response = responseContent,
            CreatedAt = DateTime.UtcNow
        };
        await _logRepository.AddAsync(logEntry);

        return responseContent;
    }

    private async Task<string> CallLlmApi(string fullPrompt)
    {
        var apiUrl = _configuration["LlmApi:BaseUrl"]
            ?? throw new InvalidOperationException("LLM API URL not configured.");

        // Split the prompt into system and user parts (they are separated by "\n\n")
        var parts = fullPrompt.Split("\n\n", 2);
        var systemPrompt = parts[0];
        var userPrompt = parts.Length > 1 ? parts[1] : "";

        var requestBody = new LlmApiRequest
        {
            Messages = new()
            {
                new LlmApiMessage { Role = "system", Content = systemPrompt },
                new LlmApiMessage { Role = "user", Content = userPrompt }
            },
            Stream = false,
            Temperature = 0.8,
            MaxTokens = -1
            // Add other parameters as needed (top_p, etc.)
        };

        var response = await _httpClient.PostAsJsonAsync(apiUrl, requestBody);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<LlmApiResponse>();
        var content = json?.Choices?.FirstOrDefault()?.Message?.Content;
        if (string.IsNullOrEmpty(content))
        {
            throw new InvalidOperationException("LLM API returned empty response.");
        }

        return content;
    }
}