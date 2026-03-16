using System.Text.Json;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Admin;

[Table("admin_log")]
public class AdminLog
{
    [Column("id")]
    public int Id { get; set; }

    [Column("admin_id")]
    public int AdminId { get; set; }

    [Column("action")]
    public string Action { get; set; } = string.Empty;

    [Column("target_type")]
    public string? TargetType { get; set; }

    [Column("target_id")]
    public int? TargetId { get; set; }

    [Column("details")]
    public JsonDocument? Details { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User.User? Admin { get; set; }
}