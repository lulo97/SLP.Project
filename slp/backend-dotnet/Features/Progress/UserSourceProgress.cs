using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Progress;

[Table("user_source_progress")]
public class UserSourceProgress
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("source_id")]
    public int SourceId { get; set; }

    /// <summary>
    /// JSON string, e.g. {"scrollTop": 1234, "scrollPercent": 0.45, "paragraphIndex": 3}
    /// </summary>
    [Column("last_position")]
    public string? LastPosition { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(UserId))]
    public virtual User.User? User { get; set; }

    [ForeignKey(nameof(SourceId))]
    public virtual Source.Source? Source { get; set; }
}