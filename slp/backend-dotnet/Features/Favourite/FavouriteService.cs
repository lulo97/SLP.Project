namespace backend_dotnet.Features.Favorite;

public interface IFavoriteService
{
    Task<IEnumerable<FavoriteDto>> GetUserFavoritesAsync(int userId, string? search = null);
    Task<FavoriteDto> CreateAsync(int userId, CreateFavoriteRequest request);
    Task<FavoriteDto?> UpdateAsync(int id, int userId, UpdateFavoriteRequest request);
    Task<bool> DeleteAsync(int id, int userId);
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

    public async Task<IEnumerable<FavoriteDto>> GetUserFavoritesAsync(int userId, string? search = null)
    {
        var items = await _repo.GetByUserAsync(userId, search);
        return items.Select(MapToDto);
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