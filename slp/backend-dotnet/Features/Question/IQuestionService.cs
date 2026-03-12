using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Question;

public interface IQuestionService
{
    Task<QuestionDto?> GetQuestionByIdAsync(int id);
    Task<IEnumerable<QuestionListDto>> GetUserQuestionsAsync(int userId);
    Task<IEnumerable<QuestionListDto>> GetAllQuestionsAsync();
    Task<QuestionDto> CreateQuestionAsync(int userId, CreateQuestionDto dto);
    Task<QuestionDto?> UpdateQuestionAsync(int id, int userId, UpdateQuestionDto dto);
    Task<bool> DeleteQuestionAsync(int id, int userId, bool isAdmin);
    Task<IEnumerable<QuestionListDto>> SearchQuestionsAsync(QuestionSearchDto search);
}