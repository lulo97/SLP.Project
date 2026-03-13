using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Quiz;

public interface IQuizService
{
    Task<QuizDto?> GetQuizByIdAsync(int id, int? currentUserId);
    Task<IEnumerable<QuizListDto>> GetUserQuizzesAsync(int userId);
    Task<IEnumerable<QuizListDto>> GetPublicQuizzesAsync(string? visibility = null);
    Task<QuizDto> CreateQuizAsync(int userId, CreateQuizDto dto);
    Task<QuizDto?> UpdateQuizAsync(int id, int userId, UpdateQuizDto dto);
    Task<bool> DeleteQuizAsync(int id, int userId, bool isAdmin);
    Task<QuizDto?> DuplicateQuizAsync(int id, int userId);
    Task<IEnumerable<QuizListDto>> SearchQuizzesAsync(string? searchTerm, int? userId, bool publicOnly);
    Task<IEnumerable<QuizQuestionDto>> GetQuizQuestionsAsync(int quizId, int? currentUserId);
    Task<QuizQuestionDto?> GetQuizQuestionByIdAsync(int id, int? currentUserId);
    Task<QuizQuestionDto> CreateQuizQuestionAsync(int quizId, int userId, CreateQuizQuestionDto dto);
    Task<QuizQuestionDto?> UpdateQuizQuestionAsync(int id, int userId, UpdateQuizQuestionDto dto);
    Task<bool> DeleteQuizQuestionAsync(int id, int userId, bool isAdmin);
}