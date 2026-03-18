namespace backend_dotnet.Features.Comment;

public class CommentDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public int? ParentId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? EditedAt { get; set; }
    public List<CommentDto> Replies { get; set; } = new();
}

public class CreateCommentRequest
{
    public int? ParentId { get; set; }
    public string TargetType { get; set; } = string.Empty; // "quiz", "source", "question"
    public int TargetId { get; set; }
    public string Content { get; set; } = string.Empty;
}

public class UpdateCommentRequest
{
    public string Content { get; set; } = string.Empty;
}

public class CommentHistoryDto
{
    public int Id { get; set; }
    public int CommentId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime EditedAt { get; set; }
}