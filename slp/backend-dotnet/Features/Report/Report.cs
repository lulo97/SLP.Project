using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Report;

[Table("report")]
public class Report
{
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("target_type")]
    public string TargetType { get; set; } = string.Empty;

    [Column("target_id")]
    public int TargetId { get; set; }

    [Column("reason")]
    public string Reason { get; set; } = string.Empty;

    [Column("resolved")]
    public bool Resolved { get; set; }

    [Column("resolved_by")]
    public int? ResolvedBy { get; set; }

    [Column("resolved_at")]
    public DateTime? ResolvedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("attempt_id")]
    public int? AttemptId { get; set; }
    // Navigation
    [JsonIgnore]
    public User.User? User { get; set; }
    public User.User? Resolver { get; set; }
    public QuizAttempt.QuizAttempt? Attempt { get; set; }
}