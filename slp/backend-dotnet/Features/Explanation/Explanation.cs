using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Explanation;

[Table("explanation")]
public class Explanation
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("source_id")]
    public int SourceId { get; set; }

    [Column("text_range", TypeName = "jsonb")]
    public string TextRangeJson { get; set; } = "{}";

    [Column("content")]
    public string Content { get; set; } = string.Empty;

    [Column("author_type")]
    [MaxLength(10)]
    public string AuthorType { get; set; } = "user"; // "user" | "system"

    [Column("editable")]
    public bool Editable { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    [ForeignKey(nameof(UserId))]
    public virtual User.User? User { get; set; }

    [ForeignKey(nameof(SourceId))]
    public virtual Source.Source? Source { get; set; }
}