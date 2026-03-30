using backend_dotnet.Features.Comment;

public interface ICommentRepository
{
    Task<Comment?> GetByIdAsync(int id);
    Task<IEnumerable<Comment>> GetByTargetAsync(string targetType, int targetId, bool includeDeleted = false);
    Task<Comment> CreateAsync(Comment comment);
    Task UpdateAsync(Comment comment);
    Task<bool> DeleteAsync(int id);
    Task<bool> RestoreAsync(int id);
    Task<IEnumerable<Comment>> GetAllAsync(bool includeDeleted = false, string? search = null);

    // History
    Task AddHistoryAsync(CommentHistory entry);
    Task<IEnumerable<CommentHistory>> GetHistoryAsync(int commentId);
}