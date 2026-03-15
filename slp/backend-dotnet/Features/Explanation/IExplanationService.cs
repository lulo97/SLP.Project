namespace backend_dotnet.Features.Explanation;

public interface IExplanationService
{
    Task<IEnumerable<ExplanationDto>> GetBySourceAsync(int sourceId, int userId);
    Task<ExplanationDto> CreateAsync(int userId, CreateExplanationRequest request);
    Task<ExplanationDto?> UpdateAsync(int id, int userId, UpdateExplanationRequest request);
    Task<bool> DeleteAsync(int id, int userId);
}