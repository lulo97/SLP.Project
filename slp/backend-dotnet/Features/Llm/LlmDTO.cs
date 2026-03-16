using System.Collections.Generic;

namespace backend_dotnet.Features.Llm;

// ─── Requests from client ───────────────────────────────────────────────────
public class LlmExplainRequest
{
    public int SourceId { get; set; }
    public string SelectedText { get; set; } = string.Empty;
    public string? Context { get; set; }
}

public class LlmGrammarRequest
{
    public string Text { get; set; } = string.Empty;
}

public class LlmTtsRequest
{
    public string Text { get; set; } = string.Empty;
    public string? Voice { get; set; }
}

// ─── LLM API DTOs ───────────────────────────────────────────────────────────
public class LlmApiMessage
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class LlmApiRequest
{
    public List<LlmApiMessage> Messages { get; set; } = new();
    public bool Stream { get; set; } = false;
    public double Temperature { get; set; } = 0.8;
    public int MaxTokens { get; set; } = -1;
    // Add other parameters if needed (top_p, etc.)
}

public class LlmApiChoice
{
    public LlmApiMessage Message { get; set; } = new();
}

public class LlmApiResponse
{
    public List<LlmApiChoice> Choices { get; set; } = new();
}

// ─── Final responses to client ──────────────────────────────────────────────
public class LlmExplainResponse
{
    public string Explanation { get; set; } = string.Empty;
}

public class LlmGrammarResponse
{
    public string CorrectedText { get; set; } = string.Empty;
}

public class LlmJobResponse
{
    public string JobId { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
}

// Job status response
public class LlmJobStatusResponse
{
    public string JobId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Result { get; set; } // the LLM response if completed
    public string? Error { get; set; }  // ← add this
    public DateTime? CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
