using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.Llm;

public class LlmLogRepository : ILlmLogRepository
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public LlmLogRepository(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<LlmLog?> GetCachedResponseAsync(int userId, string requestType, string prompt)
    {
        if (!_configuration.GetValue<bool>("LlmCache:Enabled"))
            return null;

        return await _context.LlmLogs
            .Where(log => log.UserId == userId
                       && log.RequestType == requestType
                       && log.Prompt == prompt
                       && log.Response != null)
            .OrderByDescending(log => log.CreatedAt)
            .FirstOrDefaultAsync();
    }

    public async Task AddAsync(LlmLog log)
    {
        _context.LlmLogs.Add(log);
        await _context.SaveChangesAsync();
    }

    public async Task<LlmLog?> GetByJobIdAsync(string jobId)
    {
        return await _context.LlmLogs
            .FirstOrDefaultAsync(log => log.JobId == jobId);
    }

    public async Task UpdateJobStatusAsync(string jobId, string status, string? response = null, string? error = null)
    {
        var log = await _context.LlmLogs.FirstOrDefaultAsync(l => l.JobId == jobId);
        if (log != null)
        {
            log.Status = status;
            if (response != null)
                log.Response = response;
            if (error != null)
                log.Error = error;   // set error field

            if (status == "Completed" || status == "Failed")
                log.CompletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }
    }
}