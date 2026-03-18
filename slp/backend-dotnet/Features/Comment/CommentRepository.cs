using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.Comment;

public class CommentRepository : ICommentRepository
{
    private readonly AppDbContext _db;

    public CommentRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Comment?> GetByIdAsync(int id)
    {
        return await _db.Comments
            .Include(c => c.User)
            .Include(c => c.Replies)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<IEnumerable<Comment>> GetByTargetAsync(string targetType, int targetId, bool includeDeleted = false)
    {
        var query = _db.Comments
            .Include(c => c.User)
            .Include(c => c.Replies)
            .Where(c => c.TargetType == targetType && c.TargetId == targetId && c.ParentId == null);

        if (!includeDeleted)
            query = query.Where(c => c.DeletedAt == null);

        return await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
    }

    public async Task<Comment> CreateAsync(Comment comment)
    {
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();
        return comment;
    }

    public async Task UpdateAsync(Comment comment)
    {
        comment.EditedAt = DateTime.UtcNow;
        _db.Comments.Update(comment);
        await _db.SaveChangesAsync();
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var comment = await _db.Comments.FindAsync(id);
        if (comment == null) return false;

        comment.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreAsync(int id)
    {
        var comment = await _db.Comments.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == id);
        if (comment == null || comment.DeletedAt == null) return false;

        comment.DeletedAt = null;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Comment>> GetAllAsync(bool includeDeleted = false)
    {
        var query = _db.Comments
            .Include(c => c.User)
            .Include(c => c.Replies)
            .AsQueryable();

        if (!includeDeleted)
            query = query.Where(c => c.DeletedAt == null);
        else
            query = query.IgnoreQueryFilters(); // to see soft-deleted comments

        return await query
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
    }

    public async Task AddHistoryAsync(CommentHistory entry)
    {
        _db.CommentHistories.Add(entry);
        await _db.SaveChangesAsync();
    }

    public async Task<IEnumerable<CommentHistory>> GetHistoryAsync(int commentId)
    {
        return await _db.CommentHistories
            .Where(h => h.CommentId == commentId)
            .OrderBy(h => h.EditedAt)
            .ToListAsync();
    }
}