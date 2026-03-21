using backend_dotnet.Features.Helpers;

namespace backend_dotnet.Features.Favorite;

public interface IFavoriteRepository
{
    Task<PaginatedResult<FavoriteItem>> GetByUserAsync(int userId, string? search = null, int page = 1, int pageSize = 10);
    Task<FavoriteItem?> GetByIdAsync(int id);
    Task<FavoriteItem> CreateAsync(FavoriteItem item);
    Task UpdateAsync(FavoriteItem item);
    Task DeleteAsync(int id);
}