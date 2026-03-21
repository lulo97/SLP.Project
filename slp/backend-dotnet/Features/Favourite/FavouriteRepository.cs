using backend_dotnet.Data;
using backend_dotnet.Features.Helpers;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.Favorite;

public class FavoriteRepository : IFavoriteRepository
{
    private readonly AppDbContext _context;

    public FavoriteRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<FavoriteItem>> GetByUserAsync(int userId, string? search = null, int page = 1, int pageSize = 10)
    {
        var query = _context.FavoriteItems.Where(f => f.UserId == userId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var lower = search.ToLower();
            query = query.Where(f =>
                f.Text.ToLower().Contains(lower) ||
                (f.Note != null && f.Note.ToLower().Contains(lower)));
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResult<FavoriteItem>
        {
            Items = items,
            Total = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<FavoriteItem?> GetByIdAsync(int id)
    {
        return await _context.FavoriteItems.FindAsync(id);
    }

    public async Task<FavoriteItem> CreateAsync(FavoriteItem item)
    {
        _context.FavoriteItems.Add(item);
        await _context.SaveChangesAsync();
        return item;
    }

    public async Task UpdateAsync(FavoriteItem item)
    {
        item.UpdatedAt = DateTime.UtcNow;
        _context.FavoriteItems.Update(item);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _context.FavoriteItems.FindAsync(id);
        if (entity != null)
        {
            _context.FavoriteItems.Remove(entity);
            await _context.SaveChangesAsync();
        }
    }
}