using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Dashboard;

[Table("daily_word")]
public class DailyWord
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("word")]
    public string Word { get; set; } = string.Empty;

    [Column("part_of_speech")]
    public string? PartOfSpeech { get; set; }

    [Column("vietnamese_translation")]
    public string? VietnameseTranslation { get; set; }

    [Column("example")]
    public string? Example { get; set; }

    [Column("origin")]
    public string? Origin { get; set; }

    [Column("fun_fact")]
    public string? FunFact { get; set; }

    [Column("target_date")]
    public DateTime TargetDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}