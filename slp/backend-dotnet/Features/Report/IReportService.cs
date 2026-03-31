using backend_dotnet.Features.Helpers;

namespace backend_dotnet.Features.Report;

public interface IReportService
{
    Task<ReportDto?> GetByIdAsync(int id);
    Task<PaginatedResult<ReportDto>> GetUnresolvedAsync(string? search = null, int page = 1, int pageSize = 20);
    Task<ReportDto> CreateAsync(int userId, CreateReportRequest request);
    Task<bool> ResolveAsync(int adminId, int reportId);
    Task<IEnumerable<ReportDto>> GetByUserIdAsync(int userId);
    Task<bool> DeleteAsync(int userId, int reportId);
}