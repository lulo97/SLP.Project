using backend_dotnet.Features.Admin;
using System.Text.Json;

namespace backend_dotnet.Features.Comment;

public class CommentService : ICommentService
{
    private readonly ICommentRepository _commentRepo;
    private readonly IAdminLogRepository _adminLogRepo;

    public CommentService(ICommentRepository commentRepo, IAdminLogRepository adminLogRepo)
    {
        _commentRepo = commentRepo;
        _adminLogRepo = adminLogRepo;
    }

    public async Task<CommentDto?> GetByIdAsync(int id)
    {
        var comment = await _commentRepo.GetByIdAsync(id);
        return comment == null ? null : MapToDto(comment);
    }

    public async Task<IEnumerable<CommentDto>> GetForTargetAsync(string targetType, int targetId)
    {
        var comments = await _commentRepo.GetByTargetAsync(targetType, targetId);
        return comments.Select(MapToDto);
    }

    public async Task<CommentDto> CreateAsync(int userId, CreateCommentRequest request)
    {
        var comment = new Comment
        {
            UserId = userId,
            ParentId = request.ParentId,
            TargetType = request.TargetType,
            TargetId = request.TargetId,
            Content = request.Content,
            CreatedAt = DateTime.UtcNow
        };
        var created = await _commentRepo.CreateAsync(comment);
        return MapToDto(created);
    }

    public async Task<CommentDto?> UpdateAsync(int userId, int commentId, UpdateCommentRequest request)
    {
        var comment = await _commentRepo.GetByIdAsync(commentId);
        if (comment == null || comment.UserId != userId) return null;

        comment.Content = request.Content;
        await _commentRepo.UpdateAsync(comment);
        return MapToDto(comment);
    }

    public async Task<bool> DeleteAsync(int userId, int commentId, bool isAdmin)
    {
        var comment = await _commentRepo.GetByIdAsync(commentId);
        if (comment == null) return false;
        if (!isAdmin && comment.UserId != userId) return false;

        return await _commentRepo.DeleteAsync(commentId);
    }

    public async Task<bool> RestoreAsync(int adminId, int commentId)
    {
        var success = await _commentRepo.RestoreAsync(commentId);
        if (success)
        {
            await _adminLogRepo.LogAsync(new AdminLog
            {
                AdminId = adminId,
                Action = "restore_comment",
                TargetType = "comment",
                TargetId = commentId,
                Details = JsonDocument.Parse("{}")
            });
        }
        return success;
    }

    private CommentDto MapToDto(Comment c)
    {
        return new CommentDto
        {
            Id = c.Id,
            UserId = c.UserId,
            Username = c.User?.Username ?? "deleted",
            ParentId = c.ParentId,
            Content = c.Content,
            CreatedAt = c.CreatedAt,
            EditedAt = c.EditedAt,
            Replies = c.Replies?.Select(MapToDto).ToList() ?? new()
        };
    }
}