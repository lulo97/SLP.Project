using System.Text.Json;

namespace backend_dotnet.Features.Progress;

public interface IProgressService
{
    Task<ProgressDto?> GetProgressAsync(int userId, int sourceId);
    Task<ProgressDto> UpdateProgressAsync(int userId, int sourceId, UpdateProgressRequest request);
}

public class ProgressService : IProgressService
{
    private readonly IProgressRepository _repo;

    public ProgressService(IProgressRepository repo)
    {
        _repo = repo;
    }

    public async Task<ProgressDto?> GetProgressAsync(int userId, int sourceId)
    {
        var entity = await _repo.GetAsync(userId, sourceId);
        if (entity == null)
            return new ProgressDto { SourceId = sourceId, LastPosition = null, UpdatedAt = DateTime.UtcNow };

        return MapToDto(entity);
    }

    public async Task<ProgressDto> UpdateProgressAsync(int userId, int sourceId, UpdateProgressRequest request)
    {
        var json = JsonSerializer.Serialize(request.LastPosition);
        await _repo.UpsertAsync(userId, sourceId, json);
        var entity = await _repo.GetAsync(userId, sourceId);
        return MapToDto(entity!);
    }

    private static ProgressDto MapToDto(UserSourceProgress p)
    {
        object? lastPos = null;
        if (!string.IsNullOrEmpty(p.LastPosition))
        {
            try { lastPos = JsonSerializer.Deserialize<object>(p.LastPosition); } catch { }
        }
        return new ProgressDto
        {
            SourceId = p.SourceId,
            LastPosition = lastPos,
            UpdatedAt = p.UpdatedAt
        };
    }
}