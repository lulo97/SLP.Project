using backend_dotnet.Features.Quiz;
using backend_dotnet.Features.User;

namespace backend_dotnet.Features.Dashboard;

public class DashboardService : IDashboardService
{
    private readonly IQuizRepository _quizRepository;
    private readonly IUserRepository _userRepository;
    private readonly IWordOfTheDayProvider _wordProvider;

    public DashboardService(
        IQuizRepository quizRepository,
        IUserRepository userRepository,
        IWordOfTheDayProvider wordProvider)
    {
        _quizRepository = quizRepository;
        _userRepository = userRepository;
        _wordProvider = wordProvider;
    }

    public async Task<WordOfTheDayDto> GetWordOfTheDayAsync()
    {
        // Delegate to provider (static list or DB)
        return await _wordProvider.GetWordOfTheDayAsync();
    }

    public async Task<List<TopQuizDto>> GetTopQuizzesAsync(int limit)
    {
        return await _quizRepository.GetTopQuizzesByAttemptsAsync(limit);
    }

    public async Task<UserStatsDto> GetUserStatsAsync(int userId)
    {
        return await _userRepository.GetUserStatsAsync(userId);
    }
}