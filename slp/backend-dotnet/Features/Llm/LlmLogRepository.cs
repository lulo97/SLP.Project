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
        return await _db.LlmLogs
            .Where(l =>
                l.UserId == userId &&
                l.RequestType == requestType &&
                l.Prompt == prompt &&
                l.Status == "Completed" &&
                l.Response != null)
            .OrderByDescending(l => l.CreatedAt)
            .FirstOrDefaultAsync();
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
