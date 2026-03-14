using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend_dotnet.Features.QuizAttempt;

public interface IAttemptService
{
    Task<StartAttemptResponseDto> StartAttemptAsync(int quizId, int userId);
    Task<AttemptDto?> GetAttemptAsync(int attemptId, int userId, bool isAdmin);
    Task SubmitAnswerAsync(int attemptId, int userId, SubmitAnswerDto dto);
    Task<AttemptDto> SubmitAttemptAsync(int attemptId, int userId);
    Task<AttemptReviewDto?> GetAttemptReviewAsync(int attemptId, int userId, bool isAdmin);
    Task<IEnumerable<AttemptDto>> GetUserAttemptsForQuizAsync(int quizId, int userId);
}