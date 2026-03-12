using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Tag;

public interface ITagRepository
{
    Task<Tag?> GetByNameAsync(string name);
    Task<List<Tag>> GetOrCreateTagsAsync(IEnumerable<string> names);
    Task RemoveQuizTags(int quizId);
    Task RemoveQuestionTags(int questionId);
}