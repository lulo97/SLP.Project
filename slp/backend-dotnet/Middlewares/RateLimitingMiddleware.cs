using Microsoft.Extensions.Caching.Distributed;

namespace backend_dotnet.Middlewares;

public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private const int MaxAttempts = 10;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    public RateLimitingMiddleware(RequestDelegate next, ILogger<RateLimitingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context, IDistributedCache cache)
    {
        // Apply only to login endpoint
        if (context.Request.Path.StartsWithSegments("/api/auth/login") &&
            context.Request.Method == HttpMethods.Post)
        {
            var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var key = $"rate:login:{clientIp}";

            var currentCount = await cache.GetStringAsync(key);
            int attemptCount = currentCount == null ? 0 : int.Parse(currentCount);

            if (attemptCount >= MaxAttempts)
            {
                _logger.LogWarning("Rate limit exceeded for IP {Ip}", clientIp);
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                await context.Response.WriteAsync("Too many login attempts. Please try again later.");
                return;
            }

            // Increment counter
            attemptCount++;
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = Window
            };
            await cache.SetStringAsync(key, attemptCount.ToString(), options);

            await _next(context);
        }
        else
        {
            await _next(context);
        }
    }
}