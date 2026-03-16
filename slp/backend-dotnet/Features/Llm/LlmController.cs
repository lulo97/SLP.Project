using System.Security.Claims;
using System.Text.Json;
using backend_dotnet.Features.Queue;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend_dotnet.Features.Llm;

[ApiController]
[Route("api/llm")]
[Authorize]
public class LlmController : ControllerBase
{
    private readonly ILlmService _llmService;
    private readonly ILlmLogRepository _repo;
    private readonly IQueueService _queue;
    private readonly IConfiguration _config;
    private readonly ILogger<LlmController> _logger;

    public LlmController(
        ILlmService llmService,
        ILlmLogRepository repo,
        IQueueService queue,
        IConfiguration config,
        ILogger<LlmController> logger)
    {
        _llmService = llmService;
        _repo       = repo;
        _queue      = queue;
        _config     = config;
        _logger     = logger;
    }

    // ── POST /api/llm/explain ────────────────────────────────────────────────

    /// <summary>
    /// Explain a selected piece of text.
    /// Returns the result directly when queuing is disabled,
    /// or 202 Accepted with a jobId when queuing is enabled.
    /// </summary>
    [HttpPost("explain")]
    public async Task<IActionResult> Explain([FromBody] ExplainRequest request)
    {
        var userId = GetUserId();
        var prompt = _llmService.BuildExplainPrompt(request);

        // Cache check
        if (_config.GetValue<bool>("LlmCache:Enabled", true))
        {
            var cached = await _repo.FindCachedAsync(userId, "explain", prompt);
            if (cached?.Response is not null)
            {
                _logger.LogDebug("Cache hit for explain (userId={UserId})", userId);
                return Ok(new SyncLlmResponse { Result = cached.Response });
            }
        }

        if (_config.GetValue<bool>("Queue:Enabled"))
            return await EnqueueJobAsync(userId, "explain", prompt, request);

        return await ProcessSyncAsync(userId, "explain", prompt, request);
    }

    // ── POST /api/llm/grammar-check ──────────────────────────────────────────

    /// <summary>
    /// Grammar-check and correct the supplied text.
    /// Returns the result directly when queuing is disabled,
    /// or 202 Accepted with a jobId when queuing is enabled.
    /// </summary>
    [HttpPost("grammar-check")]
    public async Task<IActionResult> GrammarCheck([FromBody] GrammarCheckRequest request)
    {
        var userId = GetUserId();
        var prompt = _llmService.BuildGrammarCheckPrompt(request);

        // Cache check
        if (_config.GetValue<bool>("LlmCache:Enabled", true))
        {
            var cached = await _repo.FindCachedAsync(userId, "grammar_check", prompt);
            if (cached?.Response is not null)
            {
                _logger.LogDebug("Cache hit for grammar_check (userId={UserId})", userId);
                return Ok(new SyncLlmResponse { Result = cached.Response });
            }
        }

        if (_config.GetValue<bool>("Queue:Enabled"))
            return await EnqueueJobAsync(userId, "grammar_check", prompt, request);

        return await ProcessSyncAsync(userId, "grammar_check", prompt, request);
    }

    // ── GET /api/llm/job/{jobId} ─────────────────────────────────────────────

    /// <summary>Poll the status of a previously submitted async job.</summary>
    [HttpGet("job/{jobId}")]
    public async Task<IActionResult> GetJobStatus(string jobId)
    {
        var log = await _repo.GetByJobIdAsync(jobId);
        if (log is null)
            return NotFound(new { message = $"Job '{jobId}' not found." });

        // Security: caller must own the job
        var userId = GetUserId();
        if (log.UserId != userId)
            return Forbid();

        return Ok(new JobStatusResponse
        {
            JobId       = log.JobId!,
            Status      = log.Status ?? "Unknown",
            Result      = log.Response,
            Error       = log.Error,
            CreatedAt   = log.CreatedAt,
            CompletedAt = log.CompletedAt
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<IActionResult> ProcessSyncAsync(
        int? userId, string requestType, string prompt, object requestObj)
    {
        try
        {
            var (content, tokensUsed) = await _llmService.CallLlmAsync(prompt);

            await _repo.CreateAsync(new LlmLog
            {
                UserId      = userId,
                RequestType = requestType,
                Prompt      = prompt,
                Response    = content,
                TokensUsed  = tokensUsed,
                Status      = "Completed",
                CompletedAt = DateTime.UtcNow
            });

            return Ok(new SyncLlmResponse { Result = content });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Synchronous LLM call failed for type={RequestType}", requestType);

            await _repo.CreateAsync(new LlmLog
            {
                UserId      = userId,
                RequestType = requestType,
                Prompt      = prompt,
                Status      = "Failed",
                Error       = ex.Message,
                CompletedAt = DateTime.UtcNow
            });

            return StatusCode(502, new { message = "LLM service is unavailable. Please try again later." });
        }
    }

    private async Task<IActionResult> EnqueueJobAsync(
        int? userId, string requestType, string prompt, object requestObj)
    {
        var jobId = Guid.NewGuid().ToString();

        // 1. Persist log with Pending status
        var log = await _repo.CreateAsync(new LlmLog
        {
            UserId      = userId,
            RequestType = requestType,
            Prompt      = prompt,
            JobId       = jobId,
            Status      = "Pending"
        });

        // 2. Push to queue
        var job = new LlmJob
        {
            JobId       = jobId,
            UserId      = userId,
            RequestType = requestType,
            RequestData = JsonSerializer.Serialize(requestObj),
            CreatedAt   = DateTime.UtcNow,
            RetryCount  = 0
        };

        await _queue.EnqueueAsync(job);

        _logger.LogInformation("Enqueued LLM job {JobId} (type={RequestType}, userId={UserId})",
            jobId, requestType, userId);

        return Accepted(new AsyncLlmResponse { JobId = jobId, Status = "Pending" });
    }

    private int? GetUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(raw, out var id) ? id : null;
    }
}
