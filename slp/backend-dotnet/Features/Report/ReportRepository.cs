using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.Report;

public class ReportRepository : IReportRepository
{
    private readonly AppDbContext _db;

    public ReportRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Report?> GetByIdAsync(int id)
    {
        return await _db.Reports
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<IEnumerable<Report>> GetUnresolvedAsync()
    {
        return await _db.Reports
            .Include(r => r.User)
            .Where(r => !r.Resolved)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Report>> GetAllAsync(bool includeResolved = false)
    {
        var query = _db.Reports.Include(r => r.User).AsQueryable();
        if (!includeResolved)
            query = query.Where(r => !r.Resolved);
        return await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
    }

    public async Task<Report> CreateAsync(Report report)
    {
        _db.Reports.Add(report);
        await _db.SaveChangesAsync();
        return report;
    }

    public async Task<bool> ResolveAsync(int id, int adminId)
    {
        var report = await _db.Reports.FindAsync(id);
        if (report == null || report.Resolved) return false;

        report.Resolved = true;
        report.ResolvedBy = adminId;
        report.ResolvedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Report>> GetByUserIdAsync(int userId)
    {
        return await _db.Reports
            .Include(r => r.User)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var report = await _db.Reports.FindAsync(id);
        if (report == null) return false;

        _db.Reports.Remove(report);
        await _db.SaveChangesAsync();
        return true;
    }
}