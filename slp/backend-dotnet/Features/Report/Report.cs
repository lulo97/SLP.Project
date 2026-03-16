using System.Text.Json.Serialization;

namespace backend_dotnet.Features.Report;

public class Report
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string TargetType { get; set; } = string.Empty; // "quiz", "question", "comment"
    public int TargetId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool Resolved { get; set; }
    public int? ResolvedBy { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [JsonIgnore]
    public User.User? User { get; set; }
    public User.User? Resolver { get; set; }
}