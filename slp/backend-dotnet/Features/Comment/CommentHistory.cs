using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Comment;

[Table("comment_history")]
public class CommentHistory
{
    [Column("id")]
    public int Id { get; set; }

    [Column("comment_id")]
    public int CommentId { get; set; }

    [Column("content")]
    public string Content { get; set; } = string.Empty;

    [Column("edited_at")]
    public DateTime EditedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Comment? Comment { get; set; }
}