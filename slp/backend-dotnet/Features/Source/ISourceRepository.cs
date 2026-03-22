using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Source;

public interface ISourceRepository
{
    Task<Source?> GetByIdAsync(int id);

    /// <summary>Returns a paged, filtered slice of the user's sources.</summary>
    Task<(IEnumerable<Source> Items, int Total)> GetUserSourcesAsync(
        int userId,
        SourceQueryParams query,
        bool includeDeleted = false);

    Task<Source> CreateAsync(Source source);
    Task UpdateAsync(Source source);
    Task SoftDeleteAsync(int id);
    Task<bool> ExistsAsync(int id);
}