using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.Llm;

public class LlmLogRepository : ILlmLogRepository
{
    private readonly AppDbContext _db;

    public LlmLogRepository(AppDbContext db) => _db = db;

    /// <inheritdoc/>
    public async Task<LlmLog?> FindCachedAsync(int? userId, string requestType, string prompt)
    {
        // 1. User-specific cache (fastest — most personalised result)
        if (userId.HasValue)
        {
            var userHit = await _db.LlmLogs
                .Where(l =>
                    l.UserId == userId &&
                    l.RequestType == requestType &&
                    l.Prompt == prompt &&
                    l.Status == "Completed" &&
                    l.Response != null)
                .OrderByDescending(l => l.CreatedAt)
                .FirstOrDefaultAsync();

            if (userHit is not null)
                return userHit;
        }

        // 2. Global cache fallback (user_id IS NULL) — serves when LLM is offline
        return await _db.LlmLogs
            .Where(l =>
                l.UserId == null &&
                l.RequestType == requestType &&
                l.Prompt == prompt &&
                l.Status == "Completed" &&
                l.Response != null)
            .OrderByDescending(l => l.CreatedAt)
            .FirstOrDefaultAsync();
    }

    /// <inheritdoc/>
    public async Task UpsertGlobalCacheAsync(
        string requestType, string prompt, string response, int? tokensUsed)
    {
        try
        {
            var existing = await _db.LlmLogs
                .Where(l =>
                    l.UserId == null &&
                    l.RequestType == requestType &&
                    l.Prompt == prompt &&
                    l.Status == "Completed")
                .FirstOrDefaultAsync();

            if (existing is not null)
            {
                // Refresh the cached value with the latest response
                existing.Response = response;
                existing.TokensUsed = tokensUsed;
                existing.CompletedAt = DateTime.UtcNow;
                _db.LlmLogs.Update(existing);
            }
            else
            {
                _db.LlmLogs.Add(new LlmLog
                {
                    UserId = null,          // marks this as a global cache row
                    RequestType = requestType,
                    Prompt = prompt,
                    Response = response,
                    TokensUsed = tokensUsed,
                    Status = "Completed",
                    CompletedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();
        }
        catch (Exception)
        {
            // Non-fatal: a concurrent request may have inserted the same row
            // just before us (race on the unique index). Swallow and move on.
        }
    }

    /// <inheritdoc/>
    public async Task<LlmLog> CreateAsync(LlmLog log)
    {
        _db.LlmLogs.Add(log);
        await _db.SaveChangesAsync();
        return log;
    }

    /// <inheritdoc/>
    public async Task UpdateAsync(LlmLog log)
    {
        _db.LlmLogs.Update(log);
        await _db.SaveChangesAsync();
    }

    /// <inheritdoc/>
    public async Task<LlmLog?> GetByJobIdAsync(string jobId)
    {
        return await _db.LlmLogs
            .FirstOrDefaultAsync(l => l.JobId == jobId);
    }

    /// <inheritdoc/>
    public async Task<List<LlmLog>> GetStaleProcessingLogsAsync()
    {
        return await _db.LlmLogs
            .Where(l => l.Status == "Processing")
            .ToListAsync();
    }
}