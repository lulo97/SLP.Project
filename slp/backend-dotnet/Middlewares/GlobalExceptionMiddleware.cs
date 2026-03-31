using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend_dotnet.Middlewares;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred.");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var response = new ErrorResponse
        {
            Message = "An internal server error occurred. Please try again later."
        };

        // Optionally include more details in development environment
        if (context.RequestServices.GetService<IWebHostEnvironment>()?.IsDevelopment() == true)
        {
            response.Message = exception.Message;
        }

        var json = JsonSerializer.Serialize(response);
        await context.Response.WriteAsync(json);
    }
}

public class ErrorResponse
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}