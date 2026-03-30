using backend_dotnet.Features.Admin;

namespace backend_dotnet.Features.Admin;

public interface IAdminLogRepository
{
    Task LogAsync(AdminLog log);
    Task<IEnumerable<AdminLog>> GetRecentAsync(AdminLogFilterDto filter);
}