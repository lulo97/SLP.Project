using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Llm;

[ApiController]
[Route("api/llm")]
public class LlmController : ControllerBase
{
    private readonly ILlmService _llmService;
    private readonly ILogger<LlmController> _logger;

    public LlmController(ILlmService llmService, ILogger<LlmController> logger)
    {
        _llmService = llmService;
        _logger = logger;
    }

    private int? CurrentUserId => User.Identity?.IsAuthenticated == true
        ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")
        : null;

    // POST /api/llm/explain
    [HttpPost("explain")]
    public async Task<IActionResult> Explain([FromBody] LlmExplainRequest request)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.SelectedText))
            return BadRequest("SelectedText is required.");

        var explanation = await _llmService.ExplainAsync(CurrentUserId.Value, request);
        return Ok(new LlmExplainResponse { Explanation = explanation });
    }

    // POST /api/llm/grammar-check
    [HttpPost("grammar-check")]
    public async Task<IActionResult> GrammarCheck([FromBody] LlmGrammarRequest request)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest("Text is required.");

        var corrected = await _llmService.GrammarCheckAsync(CurrentUserId.Value, request);
        return Ok(new LlmGrammarResponse { CorrectedText = corrected });
    }
}