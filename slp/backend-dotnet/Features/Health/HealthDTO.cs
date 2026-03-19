namespace backend_dotnet.Features.Health;

public class HealthCheckResponse
{
    public DateTime Timestamp { get; set; }
    public List<ServiceHealthDto> Services { get; set; } = new();
}

public class ServiceHealthDto
{
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // "Healthy", "Degraded", "Unhealthy"
    public string? Details { get; set; }
    public long ResponseTimeMs { get; set; }
}