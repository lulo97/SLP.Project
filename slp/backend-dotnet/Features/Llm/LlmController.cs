using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace backend_dotnet.Features.Llm;

/// <summary>
/// Queues LLM/TTS jobs via Kafka.
/// For Day 4 the Kafka producer is mocked — jobs are logged and a "queued" response
/// is returned immediately.  Swap MockKafkaProducer for a real IKafkaProducer in Day 5.
/// </summary>
[ApiController]
[Route("api/llm")]
public class LlmController : ControllerBase
{
    private readonly ILogger<LlmController> _logger;

    public LlmController(ILogger<LlmController> logger)
    {
        _logger = logger;
    }

    private int? CurrentUserId => User.Identity?.IsAuthenticated == true
        ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")
        : null;

    private static LlmQueuedResponse Queued(string topic) => new()
    {
        Status = "queued",
        JobId = Guid.NewGuid().ToString(),
        Message = $"Job submitted to {topic} queue."
    };

    // POST /api/llm/explain
    [HttpPost("explain")]
    public IActionResult Explain([FromBody] LlmExplainRequest request)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.SelectedText))
            return BadRequest("SelectedText is required.");

        _logger.LogInformation(
            "LLM explain queued: userId={UserId} sourceId={SourceId} text={Text}",
            CurrentUserId, request.SourceId, request.SelectedText[..Math.Min(80, request.SelectedText.Length)]);

        // TODO: publish to Kafka topic "llm.explain"
        return Accepted(Queued("llm.explain"));
    }

    // POST /api/llm/grammar-check
    [HttpPost("grammar-check")]
    public IActionResult GrammarCheck([FromBody] LlmGrammarRequest request)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest("Text is required.");

        _logger.LogInformation(
            "LLM grammar-check queued: userId={UserId} text={Text}",
            CurrentUserId, request.Text[..Math.Min(80, request.Text.Length)]);

        // TODO: publish to Kafka topic "llm.grammar"
        return Accepted(Queued("llm.grammar"));
    }

    // POST /api/llm/tts
    [HttpPost("tts")]
    public IActionResult Tts([FromBody] LlmTtsRequest request)
    {
        if (!CurrentUserId.HasValue) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest("Text is required.");

        if (request.Text.Length > 500)
            return BadRequest("Text exceeds 500-character limit for TTS.");

        _logger.LogInformation(
            "TTS queued: userId={UserId} textLength={Len}",
            CurrentUserId, request.Text.Length);

        // TODO: publish to Kafka topic "tts.generate"
        return Accepted(Queued("tts.generate"));
    }
}