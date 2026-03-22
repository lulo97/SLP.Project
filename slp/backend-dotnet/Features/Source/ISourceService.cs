using backend_dotnet.Features.Helpers;

namespace backend_dotnet.Features.Source;

public interface ISourceService
{
    Task<SourceDto?> GetSourceByIdAsync(int id, int? currentUserId);

    /// <summary>Returns a paged, filtered result set.</summary>
    Task<PaginatedResult<SourceListDto>> GetUserSourcesAsync(int userId, SourceQueryParams query);

    Task<SourceDto> UploadSourceAsync(int userId, IFormFile file, string? title);
    Task<SourceDto> CreateSourceFromUrlAsync(int userId, string url, string? title);
    Task<bool> DeleteSourceAsync(int id, int userId, bool isAdmin);
    Task<SourceDto> CreateNoteSourceAsync(int userId, string title, string content);
}