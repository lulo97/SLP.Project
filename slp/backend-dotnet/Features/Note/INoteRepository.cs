using backend_dotnet.Features.Helpers;
using backend_dotnet.Features.Note;

public interface INoteRepository
{
    Task<Note?> GetByIdAsync(int id);
    Task<PaginatedResult<Note>> GetUserNotesAsync(int userId, string? search = null, int page = 1, int pageSize = 10);
    Task<Note> CreateAsync(Note note);
    Task UpdateAsync(Note note);
    Task<bool> DeleteAsync(int id);
    Task<bool> ExistsAsync(int id);
}