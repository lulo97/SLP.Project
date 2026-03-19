using backend_dotnet.Features.Dashboard;

namespace backend_dotnet.Features.Dashboard;

public interface IDashboardService
{
    Task<WordOfTheDayDto> GetWordOfTheDayAsync();
    Task<List<TopQuizDto>> GetTopQuizzesAsync(int limit);
    Task<UserStatsDto> GetUserStatsAsync(int userId);
}