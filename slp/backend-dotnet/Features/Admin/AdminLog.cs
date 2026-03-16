using System.Text.Json;

namespace backend_dotnet.Features.Admin;

public class AdminLog
{
    public int Id { get; set; }
    public int AdminId { get; set; }
    public string Action { get; set; } = string.Empty; // e.g., "ban_user", "disable_quiz"
    public string? TargetType { get; set; } // "user", "quiz", "comment", ...
    public int? TargetId { get; set; }
    public JsonDocument? Details { get; set; } // additional structured data
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User.User? Admin { get; set; }
}