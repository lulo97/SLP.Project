using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using backend_dotnet.Data;

namespace backend_dotnet.Features.Source;

public class SourceRepository : ISourceRepository
{
    private readonly AppDbContext _context;

    public SourceRepository(AppDbContext context) => _context = context;

    public async Task<Source?> GetByIdAsync(int id) =>
        await _context.Sources.FirstOrDefaultAsync(s => s.Id == id && s.DeletedAt == null);

    public async Task<(IEnumerable<Source> Items, int Total)> GetUserSourcesAsync(
        int userId,
        SourceQueryParams query,
        bool includeDeleted = false)
    {
        var q = _context.Sources.Where(s => s.UserId == userId);

        if (!includeDeleted)
            q = q.Where(s => s.DeletedAt == null);

        // ── Filter: title search (case-insensitive) ─────────────────────────
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            q = q.Where(s => s.Title.ToLower().Contains(term));
        }

        // ── Filter: type exact match ────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(query.Type))
        {
            var type = query.Type.Trim().ToLower();
            q = q.Where(s => s.Type == type);
        }

        var total = await q.CountAsync();

        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var page = Math.Max(query.Page, 1);

        var items = await q
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<Source> CreateAsync(Source source)
    {
        _context.Sources.Add(source);
        await _context.SaveChangesAsync();
        return source;
    }

    public async Task UpdateAsync(Source source)
    {
        source.UpdatedAt = DateTime.UtcNow;
        _context.Sources.Update(source);
        await _context.SaveChangesAsync();
    }

    public async Task SoftDeleteAsync(int id)
    {
        var source = await _context.Sources.FindAsync(id);
        if (source != null)
        {
            source.DeletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<bool> ExistsAsync(int id) =>
        await _context.Sources.AnyAsync(s => s.Id == id && s.DeletedAt == null);
}