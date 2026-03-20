namespace backend_dotnet.Features.Question;

public interface IQuestionRepository
{
    Task<Question?> GetByIdAsync(int id);
    Task<IEnumerable<Question>> GetUserQuestionsAsync(int userId);
    Task<IEnumerable<Question>> GetAllQuestionsAsync();
    Task<Question> CreateAsync(Question question);
    Task UpdateAsync(Question question);
    Task DeleteAsync(int id);
    Task<bool> ExistsAsync(int id);
    Task<(IEnumerable<Question> Items, int TotalCount)> SearchAsync(
        string? searchTerm,
        string? type,
        List<string>? tags,
        int? userId,
        int page = 1,
        int pageSize = 20
    );
}