// D:\SLP.Project\slp\backend-dotnet\Features\Question\QuestionRepository.cs

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

    public async Task<IEnumerable<Question>> GetAllQuestionsAsync()
    {
        // No filtering by DeletedAt
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

    public async Task DeleteAsync(int id)
    {
        var question = await _context.Questions.FindAsync(id);
        if (question != null)
        {
            _context.Questions.Remove(question); // Hard delete
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
        var query = _context.Questions.AsQueryable(); // No DeletedAt filter

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