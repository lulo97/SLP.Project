using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.QuizAttempt;

[Table("quiz_attempt_answer")]
public class QuizAttemptAnswer
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("attempt_id")]
    public int AttemptId { get; set; }

    [Column("quiz_question_id")]
    public int QuizQuestionId { get; set; }

    [Column("question_snapshot", TypeName = "jsonb")]
    public string QuestionSnapshotJson { get; set; } = string.Empty;

    [Column("answer_json", TypeName = "jsonb")]
    public string AnswerJson { get; set; } = string.Empty;

    [Column("is_correct")]
    public bool? IsCorrect { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    // Navigation
    [ForeignKey(nameof(AttemptId))]
    public virtual QuizAttempt Attempt { get; set; } = null!;

    [ForeignKey(nameof(QuizQuestionId))]
    public virtual Quiz.QuizQuestion QuizQuestion { get; set; } = null!;
}