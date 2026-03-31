using backend_dotnet.Features.Comment;
using backend_dotnet.Features.Helpers;
using backend_dotnet.Features.Quiz;
using backend_dotnet.Features.Session;
using backend_dotnet.Features.User;
using System.Text.Json;

namespace backend_dotnet.Features.Admin;

public class AdminService : IAdminService
{
    private readonly IUserRepository _userRepo;
    private readonly IQuizRepository _quizRepo;
    private readonly ICommentRepository _commentRepo;
    private readonly IAdminLogRepository _logRepo;
    private readonly ISessionRepository _sessionRepo;

    public AdminService(
        IUserRepository userRepo,
        IQuizRepository quizRepo,
        ICommentRepository commentRepo,
        IAdminLogRepository logRepo,
        ISessionRepository sessionRepo)
    {
        _userRepo = userRepo;
        _quizRepo = quizRepo;
        _commentRepo = commentRepo;
        _logRepo = logRepo;
        _sessionRepo = sessionRepo;
    }

    // --- Users ---
    public async Task<PaginatedResult<UserDto>> GetAllUsersAsync(string? search = null, int page = 1, int pageSize = 20)
    {
        var (users, total) = await _userRepo.GetAllAsync(search, page, pageSize);
        var dtos = users.Select(u => new UserDto
        {
            Id = u.Id,
            Username = u.Username,
            Email = u.Email,
            EmailConfirmed = u.EmailConfirmed,
            Role = u.Role,
            Status = u.Status,
            CreatedAt = u.CreatedAt
        }).ToList();

        return new PaginatedResult<UserDto>
        {
            Items = dtos,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<bool> BanUserAsync(int adminId, int userId)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user == null || user.Role == "admin") return false;

        user.Status = "banned";
        await _userRepo.UpdateAsync(user);
        await _sessionRepo.RevokeAllForUserAsync(userId);

        await _logRepo.LogAsync(new AdminLog
        {
            AdminId = adminId,
            Action = "ban_user",
            TargetType = "user",
            TargetId = userId
        });
        return true;
    }

    public async Task<bool> UnbanUserAsync(int adminId, int userId)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user == null) return false;

        user.Status = "active";
        await _userRepo.UpdateAsync(user);

        await _logRepo.LogAsync(new AdminLog
        {
            AdminId = adminId,
            Action = "unban_user",
            TargetType = "user",
            TargetId = userId
        });
        return true;
    }

    // --- Quizzes ---
    public async Task<PaginatedResult<QuizAdminDto>> GetAllQuizzesAsync(string? search = null, int page = 1, int pageSize = 20)
    {
        var (quizzes, total) = await _quizRepo.GetAllForAdminAsync(search, page, pageSize);
        var dtos = quizzes.Select(q => new QuizAdminDto
        {
            Id = q.Id,
            Title = q.Title,
            UserId = q.UserId,
            Username = q.User?.Username ?? "deleted",
            Visibility = q.Visibility,
            Disabled = q.Disabled,
            CreatedAt = q.CreatedAt
        }).ToList();

        return new PaginatedResult<QuizAdminDto>
        {
            Items = dtos,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<bool> DisableQuizAsync(int adminId, int quizId)
    {
        var quiz = await _quizRepo.GetByIdAsync(quizId, includeDisabled: true);
        if (quiz == null) return false;

        quiz.Disabled = true;
        await _quizRepo.UpdateAsync(quiz);

        await _logRepo.LogAsync(new AdminLog
        {
            AdminId = adminId,
            Action = "disable_quiz",
            TargetType = "quiz",
            TargetId = quizId
        });
        return true;
    }

    public async Task<bool> EnableQuizAsync(int adminId, int quizId)
    {
        var quiz = await _quizRepo.GetByIdAsync(quizId, includeDisabled: true);
        if (quiz == null) return false;

        quiz.Disabled = false;
        await _quizRepo.UpdateAsync(quiz);

        await _logRepo.LogAsync(new AdminLog
        {
            AdminId = adminId,
            Action = "enable_quiz",
            TargetType = "quiz",
            TargetId = quizId
        });
        return true;
    }

    // --- Comments ---
    public async Task<PaginatedResult<CommentAdminDto>> GetAllCommentsAsync(bool includeDeleted = false, string? search = null, int page = 1, int pageSize = 20)
    {
        var (comments, total) = await _commentRepo.GetAllAsync(includeDeleted, search, page, pageSize);
        var dtos = comments.Select(c => new CommentAdminDto
        {
            Id = c.Id,
            UserId = c.UserId,
            Username = c.User?.Username ?? "deleted",
            Content = c.Content,
            TargetType = c.TargetType,
            TargetId = c.TargetId,
            CreatedAt = c.CreatedAt,
            DeletedAt = c.DeletedAt
        }).ToList();

        return new PaginatedResult<CommentAdminDto>
        {
            Items = dtos,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<bool> DeleteCommentAsync(int adminId, int commentId)
    {
        var success = await _commentRepo.DeleteAsync(commentId);
        if (success)
        {
            await _logRepo.LogAsync(new AdminLog
            {
                AdminId = adminId,
                Action = "delete_comment",
                TargetType = "comment",
                TargetId = commentId
            });
        }
        return success;
    }

    public async Task<bool> RestoreCommentAsync(int adminId, int commentId)
    {
        var success = await _commentRepo.RestoreAsync(commentId);
        if (success)
        {
            await _logRepo.LogAsync(new AdminLog
            {
                AdminId = adminId,
                Action = "restore_comment",
                TargetType = "comment",
                TargetId = commentId
            });
        }
        return success;
    }

    // --- Logs ---
    public async Task<PaginatedResult<AdminLogDto>> GetRecentLogsAsync(AdminLogFilterDto filter, int page = 1, int pageSize = 20)
    {
        var (logs, total) = await _logRepo.GetRecentAsync(filter, page, pageSize);
        var dtos = logs.Select(l => new AdminLogDto
        {
            Id = l.Id,
            AdminId = l.AdminId,
            AdminName = l.Admin?.Username ?? "unknown",
            Action = l.Action,
            TargetType = l.TargetType,
            TargetId = l.TargetId,
            Details = l.Details,
            CreatedAt = l.CreatedAt
        }).ToList();

        return new PaginatedResult<AdminLogDto>
        {
            Items = dtos,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }
}