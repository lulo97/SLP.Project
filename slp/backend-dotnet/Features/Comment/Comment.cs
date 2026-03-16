using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Comment;

[Table("comment")]
public class Comment
{
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("parent_id")]
    public int? ParentId { get; set; }

    [Column("target_type")]
    public string TargetType { get; set; } = string.Empty;

    [Column("target_id")]
    public int TargetId { get; set; }

    [Column("content")]
    public string Content { get; set; } = string.Empty;

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    [Column("edited_at")]
    public DateTime? EditedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [JsonIgnore]
    public User.User? User { get; set; }
    public Comment? Parent { get; set; }
    public ICollection<Comment> Replies { get; set; } = new List<Comment>();
}