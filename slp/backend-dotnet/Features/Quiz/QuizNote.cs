using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Quiz;

[Table("quiz_note")]
[PrimaryKey(nameof(QuizId), nameof(NoteId))]
public class QuizNote
{
    [Column("quiz_id")]
    public int QuizId { get; set; }

    [Column("note_id")]
    public int NoteId { get; set; }

    // Navigation
    [ForeignKey(nameof(QuizId))]
    public virtual Quiz Quiz { get; set; } = null!;

    [ForeignKey(nameof(NoteId))]
    public virtual Note.Note Note { get; set; } = null!;
}