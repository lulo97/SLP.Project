using Microsoft.EntityFrameworkCore;
using backend_dotnet.Data;

namespace backend_dotnet.Features.Explanation;

public class ExplanationRepository : IExplanationRepository
{
    private readonly AppDbContext _context;

    public ExplanationRepository(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Returns explanations for a source visible to this user:
    /// system explanations (user_id IS NULL) + this user's own explanations.
    /// </summary>
    public async Task<IEnumerable<Explanation>> GetBySourceIdAsync(int sourceId, int userId)
    {
        return await _context.Explanations
            .Where(e => e.SourceId == sourceId &&
                        (e.UserId == null || e.UserId == userId))
            .OrderBy(e => e.CreatedAt)
            .ToListAsync();
    }

    public async Task<Explanation?> GetByIdAsync(int id)
    {
        return await _context.Explanations.FindAsync(id);
    }

    public async Task<Explanation> CreateAsync(Explanation explanation)
    {
        _context.Explanations.Add(explanation);
        await _context.SaveChangesAsync();
        return explanation;
    }

    public async Task UpdateAsync(Explanation explanation)
    {
        explanation.UpdatedAt = DateTime.UtcNow;
        _context.Explanations.Update(explanation);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _context.Explanations.FindAsync(id);
        if (entity != null)
        {
            _context.Explanations.Remove(entity);
            await _context.SaveChangesAsync();
        }
    }
}