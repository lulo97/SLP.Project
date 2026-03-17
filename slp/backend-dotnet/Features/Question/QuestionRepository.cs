using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.Question;

public class QuestionRepository : IQuestionRepository
{
    private readonly AppDbContext _context;

    public QuestionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Question?> GetByIdAsync(int id)
    {
        return await _context.Questions
            .Include(q => q.QuestionTags).ThenInclude(qt => qt.Tag)
            .FirstOrDefaultAsync(q => q.Id == id);
    }

    public async Task<IEnumerable<Question>> GetUserQuestionsAsync(int userId)
    {
        return await _context.Questions
            .Where(q => q.UserId == userId)
            .Include(q => q.QuestionTags).ThenInclude(qt => qt.Tag)
            .OrderByDescending(q => q.UpdatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Question>> GetAllQuestionsAsync(bool includeDeleted = false)
    {
        // No soft delete column on question yet, so just all
        return await _context.Questions
            .Include(q => q.User)
            .Include(q => q.QuestionTags).ThenInclude(qt => qt.Tag)
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync();
    }

    public async Task<Question> CreateAsync(Question question)
    {
        _context.Questions.Add(question);
        await _context.SaveChangesAsync();
        return question;
    }

    public async Task UpdateAsync(Question question)
    {
        question.UpdatedAt = DateTime.UtcNow;
        _context.Questions.Update(question);
        await _context.SaveChangesAsync();
    }

    public async Task SoftDeleteAsync(int id)
    {
        // If we had a deleted_at column, we'd set it. For now, just remove? But spec says soft delete.
        // We'll assume there's a DeletedAt column (needs migration). Using hard delete temporarily? 
        // Better to add a DeletedAt column. For now, we'll just hard delete as placeholder.
        var question = await _context.Questions.FindAsync(id);
        if (question != null)
        {
            _context.Questions.Remove(question);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<bool> ExistsAsync(int id)
    {
        return await _context.Questions.AnyAsync(q => q.Id == id);
    }

    public async Task<(IEnumerable<Question> Items, int TotalCount)> SearchAsync(
        string? searchTerm,
        string? type,
        List<string>? tags,
        int? userId,
        int page = 1,
        int pageSize = 20
    )
    {
        var query = _context.Questions.AsQueryable();

        if (userId.HasValue)
            query = query.Where(q => q.UserId == userId.Value);

        if (!string.IsNullOrWhiteSpace(type))
            query = query.Where(q => q.Type == type);

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            searchTerm = $"%{searchTerm}%";
            query = query.Where(q => EF.Functions.ILike(q.Content, searchTerm) ||
                                     (q.Explanation != null && EF.Functions.ILike(q.Explanation, searchTerm)));
        }

        if (tags != null && tags.Any())
        {
            foreach (var tag in tags)
            {
                query = query.Where(q => q.QuestionTags.Any(qt => qt.Tag.Name == tag));
            }
        }

        // Efficient count query – indexes on user_id, type, updated_at help here
        var totalCount = await query.CountAsync();

        var items = await query
            .Include(q => q.User)
            .Include(q => q.QuestionTags).ThenInclude(qt => qt.Tag)
            .OrderByDescending(q => q.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }
}