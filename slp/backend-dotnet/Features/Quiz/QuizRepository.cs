using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Quiz;

public class QuizRepository : IQuizRepository
{
    private readonly AppDbContext _context;

    public QuizRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Quiz?> GetByIdAsync(int id)
    {
        // First, check if the quiz exists at all (even disabled)
        var anyQuiz = await _context.Quizzes
            .IgnoreQueryFilters()
            .Where(q => q.Id == id)
            .Select(q => new { q.Id, q.Title, q.Disabled })
            .FirstOrDefaultAsync();

        if (anyQuiz == null)
            return null;

        if (anyQuiz.Disabled)
            return null;

        var quiz = await _context.Quizzes
            .Include(q => q.QuizQuestions.OrderBy(qq => qq.DisplayOrder))
            .Include(q => q.QuizTags).ThenInclude(qt => qt.Tag)
            .Include(q => q.QuizSources).ThenInclude(qs => qs.Source)
            .Include(q => q.User)
            .FirstOrDefaultAsync(q => q.Id == id && !q.Disabled);

        return quiz;
    }

    public async Task<IEnumerable<Quiz>> GetUserQuizzesAsync(int userId, bool includeDisabled = false)
    {
        var query = _context.Quizzes.Where(q => q.UserId == userId);
        if (!includeDisabled)
            query = query.Where(q => !q.Disabled);
        return await query
            .Include(q => q.QuizTags).ThenInclude(qt => qt.Tag)
            .OrderByDescending(q => q.UpdatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Quiz>> GetPublicQuizzesAsync(string? visibility = null, bool includeDisabled = false)
    {
        var query = _context.Quizzes.AsQueryable();
        if (!includeDisabled)
            query = query.Where(q => !q.Disabled);

        if (string.IsNullOrEmpty(visibility) || visibility == "public")
            query = query.Where(q => q.Visibility == "public");
        else if (visibility == "unlisted")
            query = query.Where(q => q.Visibility == "unlisted");

        return await query
            .Include(q => q.User)
            .Include(q => q.QuizTags).ThenInclude(qt => qt.Tag)
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync();
    }

    public async Task<Quiz> CreateAsync(Quiz quiz)
    {
        _context.Quizzes.Add(quiz);
        await _context.SaveChangesAsync();
        return quiz;
    }

    public async Task UpdateAsync(Quiz quiz)
    {
        quiz.UpdatedAt = DateTime.UtcNow;
        _context.Quizzes.Update(quiz);
        await _context.SaveChangesAsync();
    }

    public async Task SoftDeleteAsync(int id)
    {
        var quiz = await _context.Quizzes.FindAsync(id);
        if (quiz != null)
        {
            quiz.Disabled = true;
            quiz.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<bool> ExistsAsync(int id)
    {
        return await _context.Quizzes.AnyAsync(q => q.Id == id && !q.Disabled);
    }

    public async Task<IEnumerable<Quiz>> SearchAsync(string? searchTerm, int? userId, bool publicOnly = true)
    {
        var query = _context.Quizzes.Where(q => !q.Disabled);
        if (publicOnly)
            query = query.Where(q => q.Visibility == "public");
        if (userId.HasValue)
            query = query.Where(q => q.UserId == userId.Value);
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            searchTerm = $"%{searchTerm}%";
            query = query.Where(q => EF.Functions.ILike(q.Title, searchTerm) ||
                                     (q.Description != null && EF.Functions.ILike(q.Description, searchTerm)));
        }
        return await query
            .Include(q => q.User)
            .Include(q => q.QuizTags).ThenInclude(qt => qt.Tag)
            .OrderByDescending(q => q.UpdatedAt)
            .ToListAsync();
    }

    // ==================== QuizQuestion repository methods ====================

    public async Task<IEnumerable<QuizQuestion>> GetQuestionsByQuizIdAsync(int quizId)
    {
        return await _context.QuizQuestions
            .Where(qq => qq.QuizId == quizId)
            .OrderBy(qq => qq.DisplayOrder)
            .ToListAsync();
    }

    public async Task<QuizQuestion?> GetQuizQuestionByIdAsync(int id)
    {
        return await _context.QuizQuestions
            .Include(qq => qq.Quiz)
            .FirstOrDefaultAsync(qq => qq.Id == id);
    }

    public async Task<QuizQuestion> CreateQuizQuestionAsync(QuizQuestion quizQuestion)
    {
        quizQuestion.CreatedAt = DateTime.UtcNow;
        quizQuestion.UpdatedAt = DateTime.UtcNow;
        _context.QuizQuestions.Add(quizQuestion);
        await _context.SaveChangesAsync();
        return quizQuestion;
    }

    public async Task UpdateQuizQuestionAsync(QuizQuestion quizQuestion)
    {
        quizQuestion.UpdatedAt = DateTime.UtcNow;
        _context.QuizQuestions.Update(quizQuestion);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteQuizQuestionAsync(int id)
    {
        var question = await _context.QuizQuestions.FindAsync(id);
        if (question != null)
        {
            _context.QuizQuestions.Remove(question);
            await _context.SaveChangesAsync();
        }
    }

    public async Task ReorderQuizQuestionsAsync(int quizId, List<int> questionIds)
    {
        var questions = await _context.QuizQuestions
            .Where(qq => qq.QuizId == quizId)
            .ToListAsync();

        for (int i = 0; i < questionIds.Count; i++)
        {
            var q = questions.FirstOrDefault(qq => qq.Id == questionIds[i]);
            if (q != null)
            {
                q.DisplayOrder = i + 1;
                q.UpdatedAt = DateTime.UtcNow;
            }
        }
        await _context.SaveChangesAsync();
    }
}