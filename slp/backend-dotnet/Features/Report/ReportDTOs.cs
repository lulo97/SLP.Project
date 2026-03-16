namespace backend_dotnet.Features.Report;

public class ReportDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public int TargetId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool Resolved { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateReportRequest
{
    public string TargetType { get; set; } = string.Empty; // "quiz", "question", "comment"
    public int TargetId { get; set; }
    public string Reason { get; set; } = string.Empty;
}