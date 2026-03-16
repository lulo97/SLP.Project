using backend_dotnet.Features.Queue;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Llm;

[ApiController]
[Route("api/llm")]
public class LlmController : ControllerBase
{
    private readonly ILlmService _llmService;
    private readonly ILogger<LlmController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IQueueService _queueService;
    private readonly ILlmLogRepository _logRepository;

    public LlmController(
        ILlmService llmService,
        ILogger<LlmController> logger,
        IConfiguration configuration,
        IQueueService queueService,
        ILlmLogRepository logRepository)
    {
        _llmService = llmService;
        _logger = logger;
        _configuration = configuration;
        _queueService = queueService;
        _logRepository = logRepository;
    }

    private int? CurrentUserId => User.Identity?.IsAuthenticated == true
        ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")
        : null;

    [HttpPost("explain")]
    public async Task<IActionResult> Explain([FromBody] LlmExplainRequest request)
    {
        if (!CurrentUserId.HasValue)
        {
            _logger.LogWarning("Explain called without authentication");
            return Unauthorized();
        }

        var userId = CurrentUserId.Value;
        _logger.LogDebug("Explain request from user {UserId}: SelectedText length {Length}, Context provided: {HasContext}",
            userId, request.SelectedText?.Length ?? 0, !string.IsNullOrWhiteSpace(request.Context));

        if (string.IsNullOrWhiteSpace(request.SelectedText))
        {
            _logger.LogWarning("Explain request from user {UserId} missing SelectedText", userId);
            return BadRequest("SelectedText is required.");
        }

        var fullPrompt = BuildExplainPrompt(request);
        var cached = await _logRepository.GetCachedResponseAsync(userId, "explain", fullPrompt);
        if (cached != null)
        {
            _logger.LogInformation("Cache hit for explain, user={UserId}, prompt hash={Hash}",
                userId, fullPrompt.GetHashCode());  // Or use a proper hash
            return Ok(new LlmExplainResponse { Explanation = cached.Response! });
        }
        _logger.LogDebug("Cache miss for explain, user={UserId}", userId);

        if (_configuration.GetValue<bool>("Queue:Enabled"))
        {
            var job = new LlmJob
            {
                UserId = userId,
                RequestType = "explain",
                RequestData = JsonSerializer.Serialize(request)
            };
            _logger.LogInformation("Enqueuing explain job {JobId} for user {UserId}", job.JobId, userId);

            var log = new LlmLog
            {
                UserId = userId,
                RequestType = "explain",
                Prompt = fullPrompt,
                JobId = job.JobId,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };
            await _logRepository.AddAsync(log);

            await _queueService.EnqueueAsync(job);

            return Accepted(new LlmJobResponse { JobId = job.JobId, Status = "Pending" });
        }
        else
        {
            _logger.LogDebug("Processing explain directly for user {UserId}", userId);
            try
            {
                var explanation = await _llmService.ExplainAsync(userId, request);
                return Ok(new LlmExplainResponse { Explanation = explanation });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing explain for user {UserId}", userId);
                throw; // Let global handler manage response
            }
        }
    }

    [HttpPost("grammar-check")]
    public async Task<IActionResult> GrammarCheck([FromBody] LlmGrammarRequest request)
    {
        if (!CurrentUserId.HasValue)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest("Text is required.");

        var userId = CurrentUserId.Value;

        var fullPrompt = BuildGrammarPrompt(request);
        var cached = await _logRepository.GetCachedResponseAsync(userId, "grammar_check", fullPrompt);
        if (cached != null)
        {
            _logger.LogInformation("Cache hit for grammar-check, user={UserId}", userId);
            return Ok(new LlmGrammarResponse { CorrectedText = cached.Response! });
        }

        if (_configuration.GetValue<bool>("Queue:Enabled"))
        {
            var job = new LlmJob
            {
                UserId = userId,
                RequestType = "grammar_check",
                RequestData = JsonSerializer.Serialize(request)
            };

            var log = new LlmLog
            {
                UserId = userId,
                RequestType = "grammar_check",
                Prompt = fullPrompt,
                JobId = job.JobId,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };
            await _logRepository.AddAsync(log);

            await _queueService.EnqueueAsync(job);

            return Accepted(new LlmJobResponse { JobId = job.JobId, Status = "Pending" });
        }
        else
        {
            var corrected = await _llmService.GrammarCheckAsync(userId, request);
            return Ok(new LlmGrammarResponse { CorrectedText = corrected });
        }
    }

    [HttpGet("job/{jobId}")]
    public async Task<IActionResult> GetJobStatus(string jobId)
    {
        var log = await _logRepository.GetByJobIdAsync(jobId);
        if (log == null)
            return NotFound();

        // Verify ownership
        if (log.UserId != CurrentUserId)
            return Forbid();

        var response = new LlmJobStatusResponse
        {
            JobId = jobId,
            Status = log.Status ?? "Unknown",
            Result = log.Response,
            Error = log.Error,
            CreatedAt = log.CreatedAt,
            CompletedAt = log.CompletedAt
        };
        return Ok(response);
    }

    private string BuildExplainPrompt(LlmExplainRequest request)
    {
        var userPrompt = request.SelectedText;
        if (!string.IsNullOrWhiteSpace(request.Context))
        {
            userPrompt = $"Context: {request.Context}\n\nText to explain: {request.SelectedText}";
        }
        return $"{LlmService.Prompts.Explain}\n\n{userPrompt}";
    }

    private string BuildGrammarPrompt(LlmGrammarRequest request)
    {
        return $"{LlmService.Prompts.GrammarCheck}\n\n{request.Text}";
    }
}