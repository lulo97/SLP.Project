using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Quiz;

[Table("quiz_question")]
public class QuizQuestion
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("quiz_id")]
    public int QuizId { get; set; }

    [Column("original_question_id")]
    public int? OriginalQuestionId { get; set; }

    [Column("question_snapshot")]
    public string? QuestionSnapshotJson { get; set; } // Stored as JSONB

    [Column("display_order")]
    public int DisplayOrder { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(QuizId))]
    public virtual Quiz Quiz { get; set; } = null!;

    [ForeignKey(nameof(OriginalQuestionId))]
    public virtual Question.Question? OriginalQuestion { get; set; }
}