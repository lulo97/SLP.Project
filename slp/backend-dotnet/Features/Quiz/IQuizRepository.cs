using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Quiz;

public interface IQuizRepository
{
    Task<Quiz?> GetByIdAsync(int id);
    Task<IEnumerable<Quiz>> GetUserQuizzesAsync(int userId, bool includeDisabled = false);
    Task<IEnumerable<Quiz>> GetPublicQuizzesAsync(string? visibility = null, bool includeDisabled = false);
    Task<Quiz> CreateAsync(Quiz quiz);
    Task UpdateAsync(Quiz quiz);
    Task SoftDeleteAsync(int id); // sets Disabled = true (admin only)
    Task<bool> ExistsAsync(int id);
    Task<IEnumerable<Quiz>> SearchAsync(string? searchTerm, int? userId, bool publicOnly = true);
    Task<IEnumerable<QuizQuestion>> GetQuestionsByQuizIdAsync(int quizId);
    Task<QuizQuestion?> GetQuizQuestionByIdAsync(int id);
    Task<QuizQuestion> CreateQuizQuestionAsync(QuizQuestion quizQuestion);
    Task UpdateQuizQuestionAsync(QuizQuestion quizQuestion);
    Task DeleteQuizQuestionAsync(int id);
    Task ReorderQuizQuestionsAsync(int quizId, List<int> questionIds); // optional
}