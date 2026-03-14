using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.QuizAttempt;

[Table("quiz_attempt")]
public class QuizAttempt
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("quiz_id")]
    public int QuizId { get; set; }

    [Column("start_time")]
    public DateTime StartTime { get; set; }

    [Column("end_time")]
    public DateTime? EndTime { get; set; }

    [Column("score")]
    public int? Score { get; set; }

    [Column("max_score")]
    public int MaxScore { get; set; }

    [Column("question_count")]
    public int QuestionCount { get; set; }

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "in_progress"; // in_progress, completed, abandoned

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    // Navigation
    [ForeignKey(nameof(UserId))]
    public virtual User.User? User { get; set; }

    [ForeignKey(nameof(QuizId))]
    public virtual Quiz.Quiz? Quiz { get; set; }

    public virtual ICollection<QuizAttemptAnswer> Answers { get; set; } = new List<QuizAttemptAnswer>();
}