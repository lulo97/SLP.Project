using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Question;

[Table("question_tag")]
public class QuestionTag
{
    [Column("question_id")]
    public int QuestionId { get; set; }

    [Column("tag_id")]
    public int TagId { get; set; }

    // Navigation
    [ForeignKey(nameof(QuestionId))]
    public virtual Question Question { get; set; } = null!;

    [ForeignKey(nameof(TagId))]
    public virtual Tag.Tag Tag { get; set; } = null!;
}