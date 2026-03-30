using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.Admin;

public class AdminLogRepository : IAdminLogRepository
{
    private readonly AppDbContext _db;

    public AdminLogRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task LogAsync(AdminLog log)
    {
        _db.AdminLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    public async Task<IEnumerable<AdminLog>> GetRecentAsync(int count = 100, string? search = null)
    {
        var query = _db.AdminLogs
            .Include(l => l.Admin)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search}%";
            query = query.Where(l =>
                (l.Admin != null && EF.Functions.ILike(l.Admin.Username, pattern)) ||
                EF.Functions.ILike(l.Action, pattern) ||
                (l.TargetType != null && EF.Functions.ILike(l.TargetType, pattern)));
        }

        return await query
            .OrderByDescending(l => l.CreatedAt)
            .Take(count)
            .ToListAsync();
    }
}