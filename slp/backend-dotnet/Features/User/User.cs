using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Features.User;

[Table("users")]
public class User
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("username")]
    public string Username { get; set; } = "";

    [Column("password_hash")]
    public string PasswordHash { get; set; } = "";

    [Column("email")]
    public string Email { get; set; } = "";

    [Column("email_confirmed")]
    public bool EmailConfirmed { get; set; }    // was EmailVerified in AuthService

    [Column("role")]
    public string Role { get; set; } = "user";

    [Column("status")]
    public string Status { get; set; } = "active";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [Column("password_reset_token")]
    public string? PasswordResetToken { get; set; }

    [Column("password_reset_expiry")]
    public DateTime? PasswordResetExpiry { get; set; }

    [Column("email_verification_token")]
    public string? EmailVerificationToken { get; set; }
}