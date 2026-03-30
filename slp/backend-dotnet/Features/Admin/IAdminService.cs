using backend_dotnet.Features.Quiz;
using backend_dotnet.Features.User;

namespace backend_dotnet.Features.Admin;

public interface IAdminService
{
    // Users
    Task<IEnumerable<UserDto>> GetAllUsersAsync(string? search = null);
    Task<bool> BanUserAsync(int adminId, int userId);
    Task<bool> UnbanUserAsync(int adminId, int userId);

    // Quizzes
    Task<IEnumerable<QuizAdminDto>> GetAllQuizzesAsync(string? search = null);
    Task<bool> DisableQuizAsync(int adminId, int quizId);
    Task<bool> EnableQuizAsync(int adminId, int quizId);

    // Comments
    Task<IEnumerable<CommentAdminDto>> GetAllCommentsAsync(bool includeDeleted = false, string? search = null);
    Task<bool> DeleteCommentAsync(int adminId, int commentId);
    Task<bool> RestoreCommentAsync(int adminId, int commentId);

    // Logs
    Task<IEnumerable<AdminLogDto>> GetRecentLogsAsync(AdminLogFilterDto filter);
}