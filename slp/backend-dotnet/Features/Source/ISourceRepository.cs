using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Source;

public interface ISourceRepository
{
    Task<Source?> GetByIdAsync(int id);
    Task<IEnumerable<Source>> GetUserSourcesAsync(int userId, bool includeDeleted = false);
    Task<Source> CreateAsync(Source source);
    Task UpdateAsync(Source source);
    Task SoftDeleteAsync(int id);
    Task<bool> ExistsAsync(int id);
}