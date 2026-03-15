using Microsoft.EntityFrameworkCore;
using backend_dotnet.Data;

namespace backend_dotnet.Features.Progress;

public class ProgressRepository : IProgressRepository
{
    private readonly AppDbContext _context;

    public ProgressRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<UserSourceProgress?> GetAsync(int userId, int sourceId)
    {
        return await _context.UserSourceProgresses
            .FirstOrDefaultAsync(p => p.UserId == userId && p.SourceId == sourceId);
    }

    public async Task UpsertAsync(int userId, int sourceId, string lastPositionJson)
    {
        var existing = await GetAsync(userId, sourceId);
        if (existing == null)
        {
            _context.UserSourceProgresses.Add(new UserSourceProgress
            {
                UserId = userId,
                SourceId = sourceId,
                LastPosition = lastPositionJson,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.LastPosition = lastPositionJson;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync();
    }
}