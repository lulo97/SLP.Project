using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Note;

public interface INoteRepository
{
    Task<Note?> GetByIdAsync(int id);
    Task<IEnumerable<Note>> GetUserNotesAsync(int userId);
    Task<Note> CreateAsync(Note note);
    Task UpdateAsync(Note note);
    Task<bool> DeleteAsync(int id);
    Task<bool> ExistsAsync(int id);
}