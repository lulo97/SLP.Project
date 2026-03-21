using backend_dotnet.Features.Helpers;
using backend_dotnet.Features.Note;

public interface INoteService
{
    Task<NoteDto?> GetNoteByIdAsync(int id, int userId);
    Task<PaginatedResult<NoteDto>> GetUserNotesAsync(int userId, string? search = null, int page = 1, int pageSize = 10);
    Task<NoteDto> CreateNoteAsync(int userId, string title, string content);
    Task<NoteDto?> UpdateNoteAsync(int id, int userId, string title, string content);
    Task<bool> DeleteNoteAsync(int id, int userId);
}