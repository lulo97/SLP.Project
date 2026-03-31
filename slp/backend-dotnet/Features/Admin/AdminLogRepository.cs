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

    public async Task<(IEnumerable<AdminLog> Items, int TotalCount)> GetRecentAsync(AdminLogFilterDto filter, int page, int pageSize)
    {
        var query = _db.AdminLogs
            .Include(l => l.Admin)
            .AsQueryable();

        if (filter.From.HasValue)
            query = query.Where(l => l.CreatedAt >= filter.From.Value);
        if (filter.To.HasValue)
            query = query.Where(l => l.CreatedAt <= filter.To.Value);
        if (filter.AdminId.HasValue)
            query = query.Where(l => l.AdminId == filter.AdminId.Value);
        if (!string.IsNullOrWhiteSpace(filter.Action))
            query = query.Where(l => l.Action == filter.Action);
        if (!string.IsNullOrWhiteSpace(filter.TargetType))
            query = query.Where(l => l.TargetType == filter.TargetType);

        // Apply search in memory after fetching
        var logs = await query.OrderByDescending(l => l.CreatedAt).ToListAsync();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var searchTerm = filter.Search.Trim().ToLowerInvariant();
            logs = logs.Where(l =>
                (l.Admin != null && l.Admin.Username.Contains(searchTerm, StringComparison.InvariantCultureIgnoreCase)) ||
                l.Action.Contains(searchTerm, StringComparison.InvariantCultureIgnoreCase) ||
                (l.TargetType != null && l.TargetType.Contains(searchTerm, StringComparison.InvariantCultureIgnoreCase)) ||
                (l.TargetId.HasValue && l.TargetId.Value.ToString().Contains(searchTerm, StringComparison.InvariantCultureIgnoreCase)) ||
                (l.Details != null && l.Details.ToString().Contains(searchTerm, StringComparison.InvariantCultureIgnoreCase))
            ).ToList();
        }

        var total = logs.Count;
        var items = logs
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return (items, total);
    }
}