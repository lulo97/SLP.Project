using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Quiz;

[Table("quiz_source")]
public class QuizSource
{
    [Column("quiz_id")]
    public int QuizId { get; set; }

    [Column("source_id")]
    public int SourceId { get; set; }

    // Navigation
    [ForeignKey(nameof(QuizId))]
    public virtual Quiz Quiz { get; set; } = null!;

    [ForeignKey(nameof(SourceId))]
    public virtual Source.Source Source { get; set; } = null!;
}