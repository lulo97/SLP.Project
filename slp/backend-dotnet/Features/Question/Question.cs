using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Question;

[Table("question")]
public class Question
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("type")]
    [MaxLength(50)]
    public string Type { get; set; } = "multiple_choice"; // multiple_choice, true_false, fill_in, etc.

    [Column("content")]
    public string Content { get; set; } = string.Empty;

    [Column("explanation")]
    public string? Explanation { get; set; }

    [Column("metadata")]
    public string? MetadataJson { get; set; } // JSONB with options, correct answers, etc.

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(UserId))]
    public virtual User.User? User { get; set; }

    public virtual ICollection<QuestionTag> QuestionTags { get; set; } = new List<QuestionTag>();
}