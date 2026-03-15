namespace backend_dotnet.Features.Explanation;

public interface IExplanationRepository
{
    Task<IEnumerable<Explanation>> GetBySourceIdAsync(int sourceId, int userId);
    Task<Explanation?> GetByIdAsync(int id);
    Task<Explanation> CreateAsync(Explanation explanation);
    Task UpdateAsync(Explanation explanation);
    Task DeleteAsync(int id);
}