namespace backend_dotnet.Features.Llm;

// ── Requests ─────────────────────────────────────────────────────────────────

public class LlmExplainRequest
{
    /// <summary>The source document the selected text belongs to.</summary>
    public int SourceId { get; set; }

    /// <summary>The user-highlighted text to be explained by the LLM.</summary>
    public string SelectedText { get; set; } = string.Empty;

    /// <summary>Optional surrounding context sent to the model for better accuracy.</summary>
    public string? Context { get; set; }
}

public class LlmGrammarRequest
{
    /// <summary>The text to grammar-check.</summary>
    public string Text { get; set; } = string.Empty;
}

public class LlmTtsRequest
{
    /// <summary>The text to convert to speech (max 500 characters).</summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>Optional voice/language hint forwarded to the TTS worker.</summary>
    public string? Voice { get; set; }
}

// ── Responses ────────────────────────────────────────────────────────────────

public class LlmQueuedResponse
{
    /// <summary>Always "queued" while the Kafka producer is in place.</summary>
    public string Status { get; set; } = "queued";

    /// <summary>Unique job identifier the client can use to poll for results.</summary>
    public string JobId { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}