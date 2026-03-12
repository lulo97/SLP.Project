using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Source;

[Table("source")]
public class Source
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("type")]
    [MaxLength(50)]
    public string Type { get; set; } = "pdf"; // pdf, txt, url, etc.

    [Column("title")]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Column("url")]
    public string? Url { get; set; }

    [Column("content", TypeName = "jsonb")]
    public string? ContentJson { get; set; } // Structured content (JSONB)

    [Column("raw_html")]
    public string? RawHtml { get; set; }

    [Column("raw_text")]
    public string? RawText { get; set; }

    [Column("file_path")]
    public string? FilePath { get; set; } // Path to uploaded file

    [Column("metadata", TypeName = "jsonb")]
    public string? MetadataJson { get; set; } // JSONB

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(UserId))]
    public virtual User.User? User { get; set; }
}