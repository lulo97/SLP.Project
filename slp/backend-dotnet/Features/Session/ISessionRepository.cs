namespace backend_dotnet.Features.Session;

public interface ISessionRepository
{
    Task CreateAsync(Session session);
    Task<Session?> GetByTokenHashAsync(string hash);
    Task RevokeAsync(string sessionId);
    Task RevokeAllForUserAsync(int userId);
}