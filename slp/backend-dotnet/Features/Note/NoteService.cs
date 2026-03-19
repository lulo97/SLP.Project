using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Note;

public class NoteService : INoteService
{
    private readonly INoteRepository _noteRepository;

    public NoteService(INoteRepository noteRepository)
    {
        _noteRepository = noteRepository;
    }

    public async Task<NoteDto?> GetNoteByIdAsync(int id, int userId)
    {
        var note = await _noteRepository.GetByIdAsync(id);
        if (note == null || note.UserId != userId)
            return null;
        return MapToDto(note);
    }

    public async Task<IEnumerable<NoteDto>> GetUserNotesAsync(int userId)
    {
        var notes = await _noteRepository.GetUserNotesAsync(userId);
        return notes.Select(MapToDto);
    }

    public async Task<NoteDto> CreateNoteAsync(int userId, string title, string content)
    {
        var note = new Note
        {
            UserId = userId,
            Title = title,
            Content = content,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var created = await _noteRepository.CreateAsync(note);
        return MapToDto(created);
    }

    public async Task<NoteDto?> UpdateNoteAsync(int id, int userId, string title, string content)
    {
        var note = await _noteRepository.GetByIdAsync(id);
        if (note == null || note.UserId != userId)
            return null;

        note.Title = title;
        note.Content = content;
        note.UpdatedAt = DateTime.UtcNow;

        await _noteRepository.UpdateAsync(note);
        return MapToDto(note);
    }

    public async Task<bool> DeleteNoteAsync(int id, int userId)
    {
        var note = await _noteRepository.GetByIdAsync(id);
        if (note == null || note.UserId != userId)
            return false;

        return await _noteRepository.DeleteAsync(id);
    }

    private static NoteDto MapToDto(Note n) => new()
    {
        Id = n.Id,
        Title = n.Title,
        Content = n.Content,
        CreatedAt = n.CreatedAt,
        UpdatedAt = n.UpdatedAt
    };
}