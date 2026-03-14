using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend_dotnet.Features.QuizAttempt;

public interface IAttemptRepository
{
    Task<QuizAttempt?> GetByIdAsync(int id);
    Task<IEnumerable<QuizAttempt>> GetAttemptsByQuizAndUserAsync(int quizId, int userId);
    Task<QuizAttempt> CreateAttemptAsync(QuizAttempt attempt);
    Task UpdateAttemptAsync(QuizAttempt attempt);
    Task<QuizAttemptAnswer?> GetAnswerAsync(int attemptId, int quizQuestionId);
    Task<IEnumerable<QuizAttemptAnswer>> GetAnswersByAttemptIdAsync(int attemptId);
    Task AddAnswerAsync(QuizAttemptAnswer answer);
    Task UpdateAnswerAsync(QuizAttemptAnswer answer);
}