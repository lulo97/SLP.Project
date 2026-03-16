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

    public async Task<IEnumerable<AdminLog>> GetRecentAsync(int count = 100)
    {
        return await _db.AdminLogs
            .Include(l => l.Admin)
            .OrderByDescending(l => l.CreatedAt)
            .Take(count)
            .ToListAsync();
    }
}