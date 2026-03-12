using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace backend_dotnet.Features.Source;

public interface ISourceService
{
    Task<SourceDto?> GetSourceByIdAsync(int id, int? currentUserId);
    Task<IEnumerable<SourceListDto>> GetUserSourcesAsync(int userId);
    Task<SourceDto> UploadSourceAsync(int userId, IFormFile file, string? title);
    Task<SourceDto> CreateSourceFromUrlAsync(int userId, string url, string? title);
    Task<bool> DeleteSourceAsync(int id, int userId, bool isAdmin);
}