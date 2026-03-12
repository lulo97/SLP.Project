using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using backend_dotnet.Data;

namespace backend_dotnet.Features.Source;

public class SourceRepository : ISourceRepository
{
    private readonly AppDbContext _context;

    public SourceRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Source?> GetByIdAsync(int id)
    {
        return await _context.Sources
            .FirstOrDefaultAsync(s => s.Id == id && s.DeletedAt == null);
    }

    public async Task<IEnumerable<Source>> GetUserSourcesAsync(int userId, bool includeDeleted = false)
    {
        var query = _context.Sources.Where(s => s.UserId == userId);
        if (!includeDeleted)
            query = query.Where(s => s.DeletedAt == null);
        return await query.OrderByDescending(s => s.CreatedAt).ToListAsync();
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

    public async Task<bool> ExistsAsync(int id)
    {
        return await _context.Sources.AnyAsync(s => s.Id == id && s.DeletedAt == null);
    }
}