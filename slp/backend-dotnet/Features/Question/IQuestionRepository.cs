using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Question;

public interface IQuestionRepository
{
    Task<Question?> GetByIdAsync(int id);
    Task<IEnumerable<Question>> GetUserQuestionsAsync(int userId);
    Task<IEnumerable<Question>> GetAllQuestionsAsync(bool includeDeleted = false);
    Task<Question> CreateAsync(Question question);
    Task UpdateAsync(Question question);
    Task SoftDeleteAsync(int id);
    Task<bool> ExistsAsync(int id);
    Task<IEnumerable<Question>> SearchAsync(string? searchTerm, string? type, List<string>? tags, int? userId);
}