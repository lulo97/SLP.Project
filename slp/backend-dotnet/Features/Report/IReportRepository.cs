using backend_dotnet.Features.Report;

public interface IReportRepository
{
    Task<Report?> GetByIdAsync(int id);
    Task<(IEnumerable<Report> Items, int TotalCount)> GetUnresolvedAsync(string? search, int page, int pageSize);
    Task<IEnumerable<Report>> GetAllAsync(bool includeResolved = false);
    Task<Report> CreateAsync(Report report);
    Task<bool> ResolveAsync(int id, int adminId);
    Task<IEnumerable<Report>> GetByUserIdAsync(int userId);
    Task<bool> DeleteAsync(int id);
}