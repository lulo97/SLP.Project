using Microsoft.AspNetCore.Mvc;

public class UserSessionStore
{
    // This is the danger zone!
    public string? CurrentUserId { get; set; }
}

[ApiController]
[Route("api")]
public class PrivacyController : ControllerBase
{
    private readonly UserSessionStore _sessionStore;

    public PrivacyController(UserSessionStore sessionStore)
    {
        _sessionStore = sessionStore;
    }

    [HttpPost("login")]
    public IActionResult Login(string userId)
    {
        _sessionStore.CurrentUserId = userId; // Sets the global state
        return Ok($"Logged in as {userId}");
    }

    [HttpGet("my-data")]
    public IActionResult GetData()
    {
        return Ok($"Showing private data for user: {_sessionStore.CurrentUserId}");
    }
}