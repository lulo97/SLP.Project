using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Quiz;

[Table("quiz")]
public class Quiz
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("title")]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("visibility")]
    [MaxLength(50)]
    public string Visibility { get; set; } = "private"; // "private", "public", "unlisted"

    [Column("disabled")]
    public bool Disabled { get; set; }

    [Column("note_id")]
    public int? NoteId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public virtual User.User? User { get; set; }

    [ForeignKey(nameof(NoteId))]
    public virtual Note.Note? Note { get; set; }

    public virtual ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();
    public virtual ICollection<QuizTag> QuizTags { get; set; } = new List<QuizTag>();
    public virtual ICollection<QuizSource> QuizSources { get; set; } = new List<QuizSource>();
}