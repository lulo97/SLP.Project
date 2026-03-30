using backend_dotnet.Features.Report;

namespace backend_dotnet.Features.Report;

public interface IReportRepository
{
    Task<Report?> GetByIdAsync(int id);
    Task<IEnumerable<Report>> GetUnresolvedAsync(string? search = null);
    Task<IEnumerable<Report>> GetAllAsync(bool includeResolved = false);
    Task<Report> CreateAsync(Report report);
    Task<bool> ResolveAsync(int id, int adminId);
    Task<IEnumerable<Report>> GetByUserIdAsync(int userId);
    Task<bool> DeleteAsync(int id); // hard delete, no guard here
}