using backend_dotnet.Features.Health;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend_dotnet.Features.Health;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin")]
public class HealthDashboardController : ControllerBase
{
    private readonly IHealthCheckService _healthCheckService;

    public HealthDashboardController(IHealthCheckService healthCheckService)
    {
        _healthCheckService = healthCheckService;
    }

    [HttpGet("services")]
    public async Task<ActionResult<HealthCheckResponse>> GetServicesHealth()
    {
        var result = await _healthCheckService.GetHealthStatusAsync();
        return Ok(result);
    }
}