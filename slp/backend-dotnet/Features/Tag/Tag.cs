using backend_dotnet.Features.Question;
using backend_dotnet.Features.Quiz;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Tag;

[Table("tag")]
public class Tag
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    // Navigation
    public virtual ICollection<QuizTag> QuizTags { get; set; } = new List<QuizTag>();
    public virtual ICollection<QuestionTag> QuestionTags { get; set; } = new List<QuestionTag>();
}