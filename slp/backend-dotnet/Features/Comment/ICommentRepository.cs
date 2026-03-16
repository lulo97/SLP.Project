using backend_dotnet.Features.Comment;

namespace backend_dotnet.Features.Comment;

public interface ICommentRepository
{
    Task<Comment?> GetByIdAsync(int id);
    Task<IEnumerable<Comment>> GetByTargetAsync(string targetType, int targetId, bool includeDeleted = false);
    Task<Comment> CreateAsync(Comment comment);
    Task UpdateAsync(Comment comment);
    Task<bool> DeleteAsync(int id); // soft delete
    Task<bool> RestoreAsync(int id); // admin only
    Task<IEnumerable<Comment>> GetAllAsync(bool includeDeleted = false);  // <-- ADD THIS

}