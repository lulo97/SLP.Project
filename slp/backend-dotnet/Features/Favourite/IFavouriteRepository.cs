namespace backend_dotnet.Features.Favorite;

public interface IFavoriteRepository
{
    Task<IEnumerable<FavoriteItem>> GetByUserAsync(int userId, string? search = null);
    Task<FavoriteItem?> GetByIdAsync(int id);
    Task<FavoriteItem> CreateAsync(FavoriteItem item);
    Task UpdateAsync(FavoriteItem item);
    Task DeleteAsync(int id);
}