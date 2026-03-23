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

        // Save initial version (v1)
        await _commentRepo.AddHistoryAsync(new CommentHistory
        {
            CommentId = created.Id,
            Content = created.Content,
            EditedAt = created.CreatedAt
        });

        return MapToDto(created);
    }

    /// <summary>
    /// Updates the content of an existing comment and appends the new version to its edit history.
    /// Only the comment's owner is permitted to perform this operation.
    /// </summary>
    /// <param name="userId">
    /// The ID of the authenticated user attempting the update.
    /// Must match the comment's <see cref="Comment.UserId"/>; otherwise the request is rejected.
    /// </param>
    /// <param name="commentId">
    /// The ID of the comment to update.
    /// </param>
    /// <param name="request">
    /// The update payload containing the new <see cref="UpdateCommentRequest.Content"/>.
    /// </param>
    /// <returns>
    /// A <see cref="CommentDto"/> reflecting the updated state of the comment,
    /// or <c>null</c> if the comment does not exist or the caller is not the owner.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <b>Ownership check:</b> If the comment is not found or <paramref name="userId"/> does not
    /// match <c>comment.UserId</c>, the method returns <c>null</c> immediately without modifying
    /// any data. The controller maps this to <c>403 Forbidden</c>.
    /// </para>
    /// <para>
    /// <b>Edit timestamp:</b> <c>EditedAt</c> is set inside <see cref="ICommentRepository.UpdateAsync"/>
    /// so the persisted value and the history snapshot share the exact same timestamp.
    /// </para>
    /// <para>
    /// <b>History strategy:</b> The new content is snapshotted <i>after</i> the comment is saved,
    /// so every <see cref="CommentHistory"/> row always represents a version that was actually
    /// persisted — never a stale intermediate state.
    /// </para>
    ///
    /// <b>Example — three-step edit flow for comment #29:</b>
    /// <code>
    /// // ── Step 1: Comment is created ──────────────────────────────────────────
    /// // CreateAsync saves initial content and writes the first history entry.
    /// //
    /// // comment table          comment_history table
    /// // ┌──────────────────┐   ┌─────────────────────────────────────────────┐
    /// // │ id │ content     │   │ id │ comment_id │ content │ edited_at       │
    /// // │ 29 │ "c1"        │   │ 42 │ 29         │ "c1"    │ 01:44:31 (v1)   │
    /// // └──────────────────┘   └─────────────────────────────────────────────┘
    ///
    /// // ── Step 2: UpdateAsync(userId:7, commentId:29, { Content:"c1 e1" }) ───
    /// // 1. GetByIdAsync(29)           → comment.Content = "c1"
    /// // 2. comment.Content = "c1 e1"
    /// // 3. UpdateAsync(comment)       → DB content = "c1 e1", EditedAt = 01:44:38
    /// // 4. AddHistoryAsync            → appends new content "c1 e1"
    /// //
    /// // comment table          comment_history table
    /// // ┌──────────────────┐   ┌─────────────────────────────────────────────┐
    /// // │ id │ content     │   │ id │ comment_id │ content  │ edited_at      │
    /// // │ 29 │ "c1 e1"     │   │ 42 │ 29         │ "c1"     │ 01:44:31 (v1)  │
    /// // └──────────────────┘   │ 43 │ 29         │ "c1 e1"  │ 01:44:38 (v2)  │
    /// //                        └─────────────────────────────────────────────┘
    ///
    /// // ── Step 3: UpdateAsync(userId:7, commentId:29, { Content:"c1 e1 e2" }) 
    /// // 1. GetByIdAsync(29)           → comment.Content = "c1 e1"
    /// // 2. comment.Content = "c1 e1 e2"
    /// // 3. UpdateAsync(comment)       → DB content = "c1 e1 e2", EditedAt = 01:44:49
    /// // 4. AddHistoryAsync            → appends new content "c1 e1 e2"
    /// //
    /// // comment table          comment_history table
    /// // ┌──────────────────┐   ┌─────────────────────────────────────────────┐
    /// // │ id │ content     │   │ id │ comment_id │ content    │ edited_at    │
    /// // │ 29 │ "c1 e1 e2"  │   │ 42 │ 29         │ "c1"       │ 01:44:31(v1) │
    /// // └──────────────────┘   │ 43 │ 29         │ "c1 e1"    │ 01:44:38(v2) │
    /// //                        │ 44 │ 29         │ "c1 e1 e2" │ 01:44:49(v3) │
    /// //                        └─────────────────────────────────────────────┘
    ///
    /// // GET /api/comments/29/history now returns:
    /// // [ { content:"c1" }, { content:"c1 e1" }, { content:"c1 e1 e2" } ]
    /// // Modal renders: "Original" → "Edit 1" → "Edit 2 (Latest saved)"
    /// </code>
    /// </remarks>
    public async Task<CommentDto?> UpdateAsync(int userId, int commentId, UpdateCommentRequest request)
    {
        var comment = await _commentRepo.GetByIdAsync(commentId);
        if (comment == null || comment.UserId != userId) return null;

        comment.Content = request.Content;
        await _commentRepo.UpdateAsync(comment); // sets EditedAt inside repo

        // Snapshot the new content AFTER updating, so history = what was saved
        await _commentRepo.AddHistoryAsync(new CommentHistory
        {
            CommentId = comment.Id,
            Content = comment.Content,          // new value ✓
            EditedAt = comment.EditedAt ?? DateTime.UtcNow
        });

        return MapToDto(comment);
    }

    public async Task<IEnumerable<CommentHistoryDto>?> GetHistoryAsync(int commentId)
    {
        var comment = await _commentRepo.GetByIdAsync(commentId);
        if (comment == null) return null;

        var history = await _commentRepo.GetHistoryAsync(commentId);
        return history.Select(h => new CommentHistoryDto
        {
            Id = h.Id,
            CommentId = h.CommentId,
            Content = h.Content,
            EditedAt = h.EditedAt
        });
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