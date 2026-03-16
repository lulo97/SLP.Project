using backend_dotnet.Features.Comment;
using backend_dotnet.Features.Quiz;
using backend_dotnet.Features.User;
using System.Text.Json;

namespace backend_dotnet.Features.Admin;

public class AdminService : IAdminService
{
    private readonly IUserRepository _userRepo;
    private readonly IQuizRepository _quizRepo;
    private readonly ICommentRepository _commentRepo;
    private readonly IAdminLogRepository _logRepo;

    public AdminService(
        IUserRepository userRepo,
        IQuizRepository quizRepo,
        ICommentRepository commentRepo,
        IAdminLogRepository logRepo)
    {
        _userRepo = userRepo;
        _quizRepo = quizRepo;
        _commentRepo = commentRepo;
        _logRepo = logRepo;
    }

    // --- Users ---
    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        var users = await _userRepo.GetAllAsync();
        return users.Select(u => new UserDto
        {
            Id = u.Id,
            Username = u.Username,
            Email = u.Email,
            EmailConfirmed = u.EmailConfirmed,
            Role = u.Role,
            Status = u.Status,
            CreatedAt = u.CreatedAt
        });
    }

    public async Task<bool> BanUserAsync(int adminId, int userId)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user == null || user.Role == "admin") return false; // cannot ban admin

        user.Status = "banned";
        await _userRepo.UpdateAsync(user);

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
    public async Task<IEnumerable<QuizAdminDto>> GetAllQuizzesAsync()
    {
        var quizzes = await _quizRepo.GetAllForAdminAsync(); // need to add this method
        return quizzes.Select(q => new QuizAdminDto
        {
            Id = q.Id,
            Title = q.Title,
            UserId = q.UserId,
            Username = q.User?.Username ?? "deleted",
            Visibility = q.Visibility,
            Disabled = q.Disabled,
            CreatedAt = q.CreatedAt
        });
    }

    public async Task<bool> DisableQuizAsync(int adminId, int quizId)
    {
        var quiz = await _quizRepo.GetByIdAsync(quizId);
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
        var quiz = await _quizRepo.GetByIdAsync(quizId);
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
    public async Task<IEnumerable<CommentAdminDto>> GetAllCommentsAsync(bool includeDeleted = false)
    {
        // You may need to extend ICommentRepository with a method to get all comments (admin view)
        // For now, we'll assume we have a method GetAllAsync
        var comments = await _commentRepo.GetAllAsync(includeDeleted);
        return comments.Select(c => new CommentAdminDto
        {
            Id = c.Id,
            UserId = c.UserId,
            Username = c.User?.Username ?? "deleted",
            Content = c.Content,
            TargetType = c.TargetType,
            TargetId = c.TargetId,
            CreatedAt = c.CreatedAt,
            DeletedAt = c.DeletedAt
        });
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
    public async Task<IEnumerable<AdminLogDto>> GetRecentLogsAsync(int count = 100)
    {
        var logs = await _logRepo.GetRecentAsync(count);
        return logs.Select(l => new AdminLogDto
        {
            Id = l.Id,
            AdminId = l.AdminId,
            AdminName = l.Admin?.Username ?? "unknown",
            Action = l.Action,
            TargetType = l.TargetType,
            TargetId = l.TargetId,
            Details = l.Details,
            CreatedAt = l.CreatedAt
        });
    }
}