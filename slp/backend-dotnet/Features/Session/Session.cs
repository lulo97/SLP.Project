using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.Session;

[Table("sessions")]
public class Session
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public int UserId { get; set; }

    public string TokenHash { get; set; } = "";

    public DateTime CreatedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public bool Revoked { get; set; }

    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }
}