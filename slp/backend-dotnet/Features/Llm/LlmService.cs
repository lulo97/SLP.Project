using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend_dotnet.Features.Llm;

/// <summary>
/// Thin wrapper around the LLM HTTP API (LM Studio / llama.cpp compatible).
/// Builds prompts, fires streaming requests, and returns the fully assembled text.
/// Caching, logging and job management are the responsibility of callers.
/// </summary>
public class LlmService : ILlmService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<LlmService> _logger;

    // Reusable serializer options — camelCase to match the server's JSON keys
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNameCaseInsensitive = true
    };

    public LlmService(HttpClient http, IConfiguration config, ILogger<LlmService> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    // ── Prompt builders ───────────────────────────────────────────────────────

    public string BuildExplainPrompt(ExplainRequest request)
    {
        var contextPart = string.IsNullOrWhiteSpace(request.Context)
            ? string.Empty
            : $"\nContext: {request.Context}";

        return $"Please explain the following text clearly and concisely:{contextPart}\n\nText: {request.SelectedText}";
    }

    public string BuildGrammarCheckPrompt(GrammarCheckRequest request)
    {
        return $"Please check and correct the grammar of the following text. " +
               $"Return only the corrected text without any explanation:\n\n{request.Text}";
    }

    // ── Core LLM call (streaming SSE) ─────────────────────────────────────────

    /// <summary>
    /// Sends <paramref name="prompt"/> to the local LLM server using the same
    /// request body as the browser UI (stream = true). Reads the SSE stream
    /// line-by-line, accumulates delta content, and returns the full text once
    /// the stream ends with <c>data: [DONE]</c>.
    /// Token usage is read from the final chunk's <c>usage</c> field when present.
    /// </summary>
    public async Task<(string Content, int? TokensUsed)> CallLlmAsync(
        string prompt, CancellationToken ct = default)
    {
        var baseUrl = _config["LlmApi:BaseUrl"]
            ?? throw new InvalidOperationException("LlmApi:BaseUrl is not configured.");

        // ── Build request body matching the curl exactly ──────────────────────
        var payload = new LlmRequestPayload
        {
            Messages = new[]
            {
                new LlmMessage { Role = "user", Content = prompt }
            },
            Stream = true,
            ReturnProgress = true,
            ReasoningFormat = "auto",
            Temperature = _config.GetValue<float>("LlmApi:Temperature", 0.8f),
            MaxTokens = _config.GetValue<int>("LlmApi:MaxTokens", -1),
            DynatempRange = 0,
            DynatempExponent = 1,
            TopK = 40,
            TopP = 0.95f,
            MinP = 0.05f,
            XtcProbability = 0,
            XtcThreshold = 0.1f,
            TypP = 1,
            RepeatLastN = 64,
            RepeatPenalty = 1,
            PresencePenalty = 0,
            FrequencyPenalty = 0,
            DryMultiplier = 0,
            DryBase = 1.75f,
            DryAllowedLength = 2,
            DryPenaltyLastN = -1,
            Samplers = new[]
            {
                "penalties", "dry", "top_n_sigma", "top_k",
                "typ_p", "top_p", "min_p", "xtc", "temperature"
            },
            TimingsPerToken = true
        };

        var bodyJson = JsonSerializer.Serialize(payload, _jsonOptions);
        using var reqMsg = new HttpRequestMessage(HttpMethod.Post, baseUrl)
        {
            Content = new StringContent(bodyJson, Encoding.UTF8, "application/json")
        };
        reqMsg.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("*/*"));

        _logger.LogDebug("Sending streaming LLM request to {Url}", baseUrl);

        // HttpCompletionOption.ResponseHeadersRead lets us stream the body
        using var response = await _http.SendAsync(
            reqMsg, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();

        // ── Read SSE stream ───────────────────────────────────────────────────
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var reader = new System.IO.StreamReader(stream, Encoding.UTF8);

        var contentBuilder = new StringBuilder();
        int? tokensUsed = null;

        while (!reader.EndOfStream && !ct.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(ct);

            // SSE lines that carry data begin with "data: "
            if (line is null || !line.StartsWith("data: ", StringComparison.Ordinal))
                continue;

            var data = line["data: ".Length..].Trim();

            // End-of-stream sentinel
            if (data == "[DONE]")
                break;

            if (string.IsNullOrEmpty(data))
                continue;

            // Parse the JSON chunk
            try
            {
                using var doc = JsonDocument.Parse(data);
                var root = doc.RootElement;

                // Delta content
                if (root.TryGetProperty("choices", out var choices) &&
                    choices.GetArrayLength() > 0)
                {
                    var choice = choices[0];

                    // Streaming uses "delta", non-streaming uses "message" — handle both
                    var messageEl = choice.TryGetProperty("delta", out var delta) ? delta
                                  : choice.TryGetProperty("message", out var message) ? message
                                  : (JsonElement?)null;

                    if (messageEl.HasValue &&
                        messageEl.Value.TryGetProperty("content", out var contentEl) &&
                        contentEl.ValueKind == JsonValueKind.String)
                    {
                        var fragment = contentEl.GetString();
                        if (!string.IsNullOrEmpty(fragment))
                            contentBuilder.Append(fragment);
                    }
                }

                // Token usage — typically present on the final chunk
                if (root.TryGetProperty("usage", out var usage) &&
                    usage.ValueKind == JsonValueKind.Object &&
                    usage.TryGetProperty("total_tokens", out var tokensEl) &&
                    tokensEl.ValueKind == JsonValueKind.Number)
                {
                    tokensUsed = tokensEl.GetInt32();
                }
            }
            catch (JsonException ex)
            {
                // Non-fatal — log and keep reading; a single malformed chunk
                // should not abort the whole response
                _logger.LogWarning(ex, "Skipping malformed SSE chunk: {Data}", data);
            }
        }

        var fullContent = contentBuilder.ToString();
        _logger.LogDebug("LLM stream complete — length={Length} tokens={Tokens}",
            fullContent.Length, tokensUsed);

        return (fullContent, tokensUsed);
    }

    // ── Convenience wrappers (used by BackgroundJobProcessor) ─────────────────

    public async Task<string> ProcessExplainAsync(
        int? userId, ExplainRequest request, CancellationToken ct = default)
    {
        var prompt = BuildExplainPrompt(request);
        var (content, _) = await CallLlmAsync(prompt, ct);
        return content;
    }

    public async Task<string> ProcessGrammarCheckAsync(
        int? userId, GrammarCheckRequest request, CancellationToken ct = default)
    {
        var prompt = BuildGrammarCheckPrompt(request);
        var (content, _) = await CallLlmAsync(prompt, ct);
        return content;
    }
}

// ── Private request-shape models (not exposed outside this file) ──────────────

file sealed class LlmMessage
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

file sealed class LlmRequestPayload
{
    public LlmMessage[] Messages { get; set; } = Array.Empty<LlmMessage>();
    public bool Stream { get; set; }
    public bool ReturnProgress { get; set; }
    public string ReasoningFormat { get; set; } = "auto";
    public float Temperature { get; set; }
    public int MaxTokens { get; set; }
    public float DynatempRange { get; set; }
    public float DynatempExponent { get; set; }
    public int TopK { get; set; }
    public float TopP { get; set; }
    public float MinP { get; set; }
    public float XtcProbability { get; set; }
    public float XtcThreshold { get; set; }
    public float TypP { get; set; }
    public int RepeatLastN { get; set; }
    public float RepeatPenalty { get; set; }
    public float PresencePenalty { get; set; }
    public float FrequencyPenalty { get; set; }
    public float DryMultiplier { get; set; }
    public float DryBase { get; set; }
    public int DryAllowedLength { get; set; }
    public int DryPenaltyLastN { get; set; }
    public string[] Samplers { get; set; } = Array.Empty<string>();
    public bool TimingsPerToken { get; set; }
}