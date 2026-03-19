using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using backend_dotnet.Data;

namespace backend_dotnet.Features.Note;

public class NoteRepository : INoteRepository
{
    private readonly AppDbContext _context;

    public NoteRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Note?> GetByIdAsync(int id)
    {
        return await _context.Notes.FindAsync(id);
    }

    public async Task<IEnumerable<Note>> GetUserNotesAsync(int userId)
    {
        return await _context.Notes
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
    }

    public async Task<Note> CreateAsync(Note note)
    {
        _context.Notes.Add(note);
        await _context.SaveChangesAsync();
        return note;
    }

    public async Task UpdateAsync(Note note)
    {
        note.UpdatedAt = DateTime.UtcNow;
        _context.Entry(note).State = EntityState.Modified;
        await _context.SaveChangesAsync();
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var note = await _context.Notes.FindAsync(id);
        if (note == null) return false;

        _context.Notes.Remove(note);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(int id)
    {
        return await _context.Notes.AnyAsync(n => n.Id == id);
    }
}