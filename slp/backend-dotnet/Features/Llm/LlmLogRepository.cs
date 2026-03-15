using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using backend_dotnet.Data;

namespace backend_dotnet.Features.Llm;

public class LlmLogRepository : ILlmLogRepository
{
    private readonly AppDbContext _context;

    public LlmLogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<LlmLog?> GetCachedResponseAsync(int userId, string requestType, string prompt)
    {
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
}