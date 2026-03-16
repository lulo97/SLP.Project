using backend_dotnet.Features.Report;

namespace backend_dotnet.Features.Report;

public interface IReportService
{
    Task<ReportDto?> GetByIdAsync(int id);
    Task<IEnumerable<ReportDto>> GetUnresolvedAsync();
    Task<ReportDto> CreateAsync(int userId, CreateReportRequest request);
    Task<bool> ResolveAsync(int adminId, int reportId);
}