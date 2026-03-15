namespace backend_dotnet.Features.Progress;

public interface IProgressRepository
{
    Task<UserSourceProgress?> GetAsync(int userId, int sourceId);
    Task UpsertAsync(int userId, int sourceId, string lastPositionJson);
}