using backend_dotnet.Features.Helpers;

namespace backend_dotnet.Features.Favorite;

public interface IFavoriteService
{
    Task<PaginatedResult<FavoriteDto>> GetUserFavoritesAsync(int userId, string? search = null, int page = 1, int pageSize = 10);
    Task<FavoriteDto> CreateAsync(int userId, CreateFavoriteRequest request);
    Task<FavoriteDto?> UpdateAsync(int id, int userId, UpdateFavoriteRequest request);
    Task<bool> DeleteAsync(int id, int userId);
    Task<FavoriteDto?> GetByIdAsync(int id, int userId);
}

public class FavoriteService : IFavoriteService
{
    private static readonly HashSet<string> AllowedTypes =
        new(StringComparer.OrdinalIgnoreCase) { "word", "phrase", "idiom", "other" };

    private readonly IFavoriteRepository _repo;

    public FavoriteService(IFavoriteRepository repo)
    {
        _repo = repo;
    }

    public async Task<FavoriteDto?> GetByIdAsync(int id, int userId)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null || entity.UserId != userId) return null;
        return MapToDto(entity);
    }

    public async Task<PaginatedResult<FavoriteDto>> GetUserFavoritesAsync(int userId, string? search = null, int page = 1, int pageSize = 10)
    {
        var paginated = await _repo.GetByUserAsync(userId, search, page, pageSize);
        return new PaginatedResult<FavoriteDto>
        {
            Items = paginated.Items.Select(MapToDto).ToList(),
            Total = paginated.Total,
            Page = paginated.Page,
            PageSize = paginated.PageSize
        };
    }

    public async Task<FavoriteDto> CreateAsync(int userId, CreateFavoriteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            throw new ArgumentException("Text is required.");

        var type = AllowedTypes.Contains(request.Type) ? request.Type.ToLower() : "other";

        var item = new FavoriteItem
        {
            UserId = userId,
            Text = request.Text.Trim(),
            Type = type,
            Note = request.Note?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var created = await _repo.CreateAsync(item);
        return MapToDto(created);
    }

    public async Task<FavoriteDto?> UpdateAsync(int id, int userId, UpdateFavoriteRequest request)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null || entity.UserId != userId) return null;

        if (!string.IsNullOrWhiteSpace(request.Text))
            entity.Text = request.Text.Trim();

        if (request.Type != null)
            entity.Type = AllowedTypes.Contains(request.Type) ? request.Type.ToLower() : "other";

        if (request.Note != null)
            entity.Note = request.Note.Trim();

        await _repo.UpdateAsync(entity);
        return MapToDto(entity);
    }

    public async Task<bool> DeleteAsync(int id, int userId)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null || entity.UserId != userId) return false;

        await _repo.DeleteAsync(id);
        return true;
    }

    private static FavoriteDto MapToDto(FavoriteItem f) => new()
    {
        Id = f.Id,
        Text = f.Text,
        Type = f.Type,
        Note = f.Note,
        CreatedAt = f.CreatedAt,
        UpdatedAt = f.UpdatedAt
    };
}