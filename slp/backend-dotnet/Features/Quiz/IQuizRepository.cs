using backend_dotnet.Features.Dashboard;

namespace backend_dotnet.Features.Quiz;

public interface IQuizRepository
{
    Task<Quiz?> GetByIdAsync(int id, bool includeDisabled = false);   // <-- added parameter
    Task<IEnumerable<Quiz>> GetUserQuizzesAsync(int userId, bool includeDisabled = false);
    Task<IEnumerable<Quiz>> GetPublicQuizzesAsync(string? visibility = null, bool includeDisabled = false);
    Task<Quiz> CreateAsync(Quiz quiz);
    Task UpdateAsync(Quiz quiz);
    Task SoftDeleteAsync(int id);
    Task HardDeleteAsync(int id);
    Task<bool> ExistsAsync(int id);
    Task<(IEnumerable<Quiz> Items, int TotalCount)> SearchAsync(
        string? searchTerm,
        int? userId,
        string? visibility,
        bool includeDisabled,
        string? sortBy,
        string? sortOrder,
        int page,
        int pageSize);
    Task<IEnumerable<QuizQuestion>> GetQuestionsByQuizIdAsync(int quizId);
    Task<QuizQuestion?> GetQuizQuestionByIdAsync(int id);
    Task<QuizQuestion> CreateQuizQuestionAsync(QuizQuestion quizQuestion);
    Task UpdateQuizQuestionAsync(QuizQuestion quizQuestion);
    Task DeleteQuizQuestionAsync(int id);
    Task ReorderQuizQuestionsAsync(int quizId, List<int> questionIds);
    Task<IEnumerable<Note.Note>> GetNotesByQuizIdAsync(int quizId);
    Task AddNoteToQuizAsync(int quizId, int noteId);
    Task RemoveNoteFromQuizAsync(int quizId, int noteId);
    Task<Note.Note> CreateNoteAndAddToQuizAsync(int quizId, int userId, string title, string content);
    Task<Note.Note?> GetNoteByIdAndUserAsync(int noteId, int userId);
    Task<IEnumerable<Source.Source>> GetSourcesByQuizIdAsync(int quizId);
    Task AddSourceToQuizAsync(int quizId, int sourceId);
    Task RemoveSourceFromQuizAsync(int quizId, int sourceId);
    Task<IEnumerable<Quiz>> GetAllForAdminAsync();
    Task<List<TopQuizDto>> GetTopQuizzesByAttemptsAsync(int limit);

}