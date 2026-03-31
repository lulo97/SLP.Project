using backend_dotnet.Features.Admin;
using backend_dotnet.Features.Helpers;

namespace backend_dotnet.Features.Report;

public class ReportService : IReportService
{
    private readonly IReportRepository _reportRepo;
    private readonly IAdminLogRepository _adminLogRepo;

    public ReportService(IReportRepository reportRepo, IAdminLogRepository adminLogRepo)
    {
        _reportRepo = reportRepo;
        _adminLogRepo = adminLogRepo;
    }

    public async Task<ReportDto?> GetByIdAsync(int id)
    {
        var report = await _reportRepo.GetByIdAsync(id);
        return report == null ? null : MapToDto(report);
    }

    public async Task<PaginatedResult<ReportDto>> GetUnresolvedAsync(string? search = null, int page = 1, int pageSize = 20)
    {
        var (reports, total) = await _reportRepo.GetUnresolvedAsync(search, page, pageSize);
        var dtos = reports.Select(MapToDto).ToList();

        return new PaginatedResult<ReportDto>
        {
            Items = dtos,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ReportDto> CreateAsync(int userId, CreateReportRequest request)
    {
        var report = new Report
        {
            UserId = userId,
            TargetType = request.TargetType,
            TargetId = request.TargetId,
            Reason = request.Reason,
            AttemptId = request.AttemptId,
            CreatedAt = DateTime.UtcNow
        };
        var created = await _reportRepo.CreateAsync(report);
        return MapToDto(created);
    }

    public async Task<bool> ResolveAsync(int adminId, int reportId)
    {
        var success = await _reportRepo.ResolveAsync(reportId, adminId);
        if (success)
        {
            await _adminLogRepo.LogAsync(new AdminLog
            {
                AdminId = adminId,
                Action = "resolve_report",
                TargetType = "report",
                TargetId = reportId
            });
        }
        return success;
    }

    public async Task<IEnumerable<ReportDto>> GetByUserIdAsync(int userId)
    {
        var reports = await _reportRepo.GetByUserIdAsync(userId);
        return reports.Select(MapToDto);
    }

    public async Task<bool> DeleteAsync(int userId, int reportId)
    {
        var report = await _reportRepo.GetByIdAsync(reportId);
        if (report == null) return false;
        if (report.UserId != userId) return false;
        if (report.Resolved) return false;

        return await _reportRepo.DeleteAsync(reportId);
    }

    private ReportDto MapToDto(Report r)
    {
        return new ReportDto
        {
            Id = r.Id,
            UserId = r.UserId,
            Username = r.User?.Username ?? "unknown",
            TargetType = r.TargetType,
            TargetId = r.TargetId,
            Reason = r.Reason,
            Resolved = r.Resolved,
            ResolvedAt = r.ResolvedAt,
            CreatedAt = r.CreatedAt,
            AttemptId = r.AttemptId
        };
    }
}