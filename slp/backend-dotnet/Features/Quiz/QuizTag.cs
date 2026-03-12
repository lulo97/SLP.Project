using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Quiz;

[Table("quiz_tag")]
public class QuizTag
{
    [Column("quiz_id")]
    public int QuizId { get; set; }

    [Column("tag_id")]
    public int TagId { get; set; }

    // Navigation
    [ForeignKey(nameof(QuizId))]
    public virtual Quiz Quiz { get; set; } = null!;

    [ForeignKey(nameof(TagId))]
    public virtual Tag.Tag Tag { get; set; } = null!;
}