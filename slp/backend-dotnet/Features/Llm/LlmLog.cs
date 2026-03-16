using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Llm;

[Table("llm_log")]
public class LlmLog
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("request_type")]
    [MaxLength(30)]
    public string RequestType { get; set; } = string.Empty;

    [Column("prompt")]
    public string Prompt { get; set; } = string.Empty;

    [Column("response")]
    public string? Response { get; set; }

    [Column("tokens_used")]
    public int? TokensUsed { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // New fields for queuing
    [Column("job_id")]
    [MaxLength(50)]
    public string? JobId { get; set; }

    [Column("status")]
    [MaxLength(20)]
    public string? Status { get; set; } // Pending, Processing, Completed, Failed

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }
    [Column("error")]
    public string? Error { get; set; }   // new field for failure details

    // Navigation property
    [ForeignKey(nameof(UserId))]
    public virtual User.User? User { get; set; }
}