using System.Text.Json.Serialization;

namespace backend_dotnet.Features.Comment;

public class Comment
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? ParentId { get; set; }
    public string TargetType { get; set; } = string.Empty; // "quiz", "source", "question"
    public int TargetId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime? DeletedAt { get; set; }
    public DateTime? EditedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [JsonIgnore]
    public User.User? User { get; set; }
    public Comment? Parent { get; set; }
    public ICollection<Comment> Replies { get; set; } = new List<Comment>();
}