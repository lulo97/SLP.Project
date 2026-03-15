using System.Text.Json;

namespace backend_dotnet.Features.Explanation;

public class ExplanationService : IExplanationService
{
    private readonly IExplanationRepository _repo;
    private readonly Source.ISourceRepository _sourceRepo;

    public ExplanationService(IExplanationRepository repo, Source.ISourceRepository sourceRepo)
    {
        _repo = repo;
        _sourceRepo = sourceRepo;
    }

    public async Task<IEnumerable<ExplanationDto>> GetBySourceAsync(int sourceId, int userId)
    {
        // Verify source belongs to user
        var source = await _sourceRepo.GetByIdAsync(sourceId);
        if (source == null || source.UserId != userId)
            return Enumerable.Empty<ExplanationDto>();

        var explanations = await _repo.GetBySourceIdAsync(sourceId, userId);
        return explanations.Select(MapToDto);
    }

    public async Task<ExplanationDto> CreateAsync(int userId, CreateExplanationRequest request)
    {
        var textRangeJson = JsonSerializer.Serialize(request.TextRange);

        var entity = new Explanation
        {
            UserId = userId,
            SourceId = request.SourceId,
            TextRangeJson = textRangeJson,
            Content = request.Content,
            AuthorType = "user",
            Editable = true,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _repo.CreateAsync(entity);
        return MapToDto(created);
    }

    public async Task<ExplanationDto?> UpdateAsync(int id, int userId, UpdateExplanationRequest request)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null) return null;

        // Only the owner can edit; system explanations are not editable
        if (entity.UserId != userId || !entity.Editable) return null;

        entity.Content = request.Content;
        await _repo.UpdateAsync(entity);
        return MapToDto(entity);
    }

    public async Task<bool> DeleteAsync(int id, int userId)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null) return false;
        if (entity.UserId != userId) return false;

        await _repo.DeleteAsync(id);
        return true;
    }

    private static ExplanationDto MapToDto(Explanation e)
    {
        object? textRange = null;
        try { textRange = JsonSerializer.Deserialize<object>(e.TextRangeJson); } catch { }

        return new ExplanationDto
        {
            Id = e.Id,
            UserId = e.UserId,
            SourceId = e.SourceId,
            TextRange = textRange,
            Content = e.Content,
            AuthorType = e.AuthorType,
            Editable = e.Editable,
            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt
        };
    }
}