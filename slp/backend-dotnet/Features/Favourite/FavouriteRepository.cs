using Microsoft.EntityFrameworkCore;
using backend_dotnet.Data;

namespace backend_dotnet.Features.Favorite;

public class FavoriteRepository : IFavoriteRepository
{
    private readonly AppDbContext _context;

    public FavoriteRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<FavoriteItem>> GetByUserAsync(int userId, string? search = null)
    {
        var query = _context.FavoriteItems.Where(f => f.UserId == userId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var lower = search.ToLower();
            query = query.Where(f =>
                f.Text.ToLower().Contains(lower) ||
                (f.Note != null && f.Note.ToLower().Contains(lower)));
        }

        return await query.OrderByDescending(f => f.CreatedAt).ToListAsync();
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