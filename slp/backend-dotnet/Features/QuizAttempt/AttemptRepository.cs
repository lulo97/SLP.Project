using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend_dotnet.Features.QuizAttempt;

public class AttemptRepository : IAttemptRepository
{
    private readonly AppDbContext _context;

    public AttemptRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<QuizAttempt?> GetByIdAsync(int id)
    {
        return await _context.QuizAttempts
            .Include(a => a.Answers)
            .Include(a => a.Quiz)
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task<IEnumerable<QuizAttempt>> GetAttemptsByQuizAndUserAsync(int quizId, int userId)
    {
        return await _context.QuizAttempts
            .Where(a => a.QuizId == quizId && a.UserId == userId)
            .OrderByDescending(a => a.StartTime)
            .ToListAsync();
    }

    public async Task<QuizAttempt> CreateAttemptAsync(QuizAttempt attempt)
    {
        _context.QuizAttempts.Add(attempt);
        await _context.SaveChangesAsync();
        return attempt;
    }

    public async Task UpdateAttemptAsync(QuizAttempt attempt)
    {
        attempt.UpdatedAt = DateTime.UtcNow;
        _context.QuizAttempts.Update(attempt);
        await _context.SaveChangesAsync();
    }

    public async Task<QuizAttemptAnswer?> GetAnswerAsync(int attemptId, int quizQuestionId)
    {
        return await _context.QuizAttemptAnswers
            .FirstOrDefaultAsync(a => a.AttemptId == attemptId && a.QuizQuestionId == quizQuestionId);
    }

    public async Task<IEnumerable<QuizAttemptAnswer>> GetAnswersByAttemptIdAsync(int attemptId)
    {
        return await _context.QuizAttemptAnswers
            .Where(a => a.AttemptId == attemptId)
            .ToListAsync();
    }

    public async Task AddAnswerAsync(QuizAttemptAnswer answer)
    {
        answer.CreatedAt = DateTime.UtcNow;
        answer.UpdatedAt = DateTime.UtcNow;
        _context.QuizAttemptAnswers.Add(answer);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAnswerAsync(QuizAttemptAnswer answer)
    {
        answer.UpdatedAt = DateTime.UtcNow;
        _context.QuizAttemptAnswers.Update(answer);
        await _context.SaveChangesAsync();
    }
}