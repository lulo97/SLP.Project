using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Note;

public interface INoteService
{
    Task<NoteDto?> GetNoteByIdAsync(int id, int userId);
    Task<IEnumerable<NoteDto>> GetUserNotesAsync(int userId);
    Task<NoteDto> CreateNoteAsync(int userId, string title, string content);
    Task<NoteDto?> UpdateNoteAsync(int id, int userId, string title, string content);
    Task<bool> DeleteNoteAsync(int id, int userId);
}