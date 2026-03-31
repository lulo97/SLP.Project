using backend_dotnet.Features.Helpers;
using backend_dotnet.Features.Quiz;
using backend_dotnet.Features.User;

namespace backend_dotnet.Features.Admin;

public interface IAdminService
{
    // Users
    Task<PaginatedResult<UserDto>> GetAllUsersAsync(string? search = null, int page = 1, int pageSize = 20);
    Task<bool> BanUserAsync(int adminId, int userId);
    Task<bool> UnbanUserAsync(int adminId, int userId);

    // Quizzes
    Task<PaginatedResult<QuizAdminDto>> GetAllQuizzesAsync(string? search = null, int page = 1, int pageSize = 20);
    Task<bool> DisableQuizAsync(int adminId, int quizId);
    Task<bool> EnableQuizAsync(int adminId, int quizId);

    // Comments
    Task<PaginatedResult<CommentAdminDto>> GetAllCommentsAsync(bool includeDeleted = false, string? search = null, int page = 1, int pageSize = 20);
    Task<bool> DeleteCommentAsync(int adminId, int commentId);
    Task<bool> RestoreCommentAsync(int adminId, int commentId);

    // Logs
    Task<PaginatedResult<AdminLogDto>> GetRecentLogsAsync(AdminLogFilterDto filter, int page = 1, int pageSize = 20);
}