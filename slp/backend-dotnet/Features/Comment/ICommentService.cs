using backend_dotnet.Features.Comment;

public interface ICommentService
{
    Task<CommentDto?> GetByIdAsync(int id);
    Task<IEnumerable<CommentDto>> GetForTargetAsync(string targetType, int targetId);
    Task<CommentDto> CreateAsync(int userId, CreateCommentRequest request);
    Task<CommentDto?> UpdateAsync(int userId, int commentId, UpdateCommentRequest request);
    Task<bool> DeleteAsync(int userId, int commentId, bool isAdmin);
    Task<bool> RestoreAsync(int adminId, int commentId);

    // History
    Task<IEnumerable<CommentHistoryDto>?> GetHistoryAsync(int commentId);
}