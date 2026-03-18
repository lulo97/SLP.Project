using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace backend_dotnet.Extensions;

public static class WebApplicationExtensions
{
    // ── Database ──────────────────────────────────────────────────────────────

    public static async Task CheckDatabaseConnectionAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        try
        {
            logger.LogInformation("Checking database connection...");

            var connectionString = configuration.GetConnectionString("Default");
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();

            await using var command = new NpgsqlCommand("SELECT 1", connection);
            var result = await command.ExecuteScalarAsync();

            if (result is null || Convert.ToInt32(result) != 1)
                throw new Exception("Database query returned unexpected result. ConnectionString=" + connectionString);

            logger.LogInformation("✓ Database connection successful");

            try
            {
                await dbContext.Database.ExecuteSqlRawAsync("SELECT 1 FROM users LIMIT 1");
                logger.LogInformation("✓ Users table is accessible");
            }
            catch (Exception ex)
            {
                logger.LogWarning("Users table may not exist yet: {Message}", ex.Message);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "✗ Database connection failed!");
            logger.LogError("Please check: 1. PostgreSQL is running 2. Connection string is correct 3. Database exists");
            throw;
        }
    }

    // ── LLM (llama.cpp) ───────────────────────────────────────────────────────

    /// <summary>
    /// Probes the llama.cpp <c>GET /health</c> endpoint.
    /// Returns 200 {"status":"ok"} when a model is loaded and ready.
    /// Returns 503 while the model is still loading — logged as a warning, not fatal.
    /// Non-fatal overall: a missing or offline LLM should not prevent app startup
    /// because cached responses in llm_log will still be served.
    /// </summary>
    public static async Task CheckLlmConnectionAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var httpFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();

        var completionsUrl = configuration["LlmApi:BaseUrl"];
        if (string.IsNullOrWhiteSpace(completionsUrl))
        {
            logger.LogWarning("LlmApi:BaseUrl is not configured — skipping LLM health check");
            return;
        }

        // Derive /health from the configured completions URL
        // e.g. http://llama-container:3003/v1/chat/completions → http://llama-container:3003/health
        string healthUrl;
        try
        {
            var uri = new Uri(completionsUrl);
            healthUrl = $"{uri.Scheme}://{uri.Host}:{uri.Port}/health";
        }
        catch
        {
            logger.LogWarning("LlmApi:BaseUrl is not a valid URI — skipping LLM health check");
            return;
        }

        logger.LogInformation("Checking LLM server health at {Url} ...", healthUrl);

        try
        {
            var http = httpFactory.CreateClient();
            http.Timeout = TimeSpan.FromSeconds(10);

            using var response = await http.GetAsync(healthUrl);

            if (response.IsSuccessStatusCode)
            {
                logger.LogInformation("✓ LLM server is ready (HTTP {StatusCode})", (int)response.StatusCode);
            }
            else if ((int)response.StatusCode == 503)
            {
                // llama.cpp returns 503 while loading the model — not an error, just warming up
                logger.LogWarning(
                    "⚠ LLM server is loading its model (HTTP 503) — requests will be served from cache until it is ready");
            }
            else
            {
                logger.LogWarning(
                    "✗ LLM server returned unexpected HTTP {StatusCode}", (int)response.StatusCode);
            }
        }
        catch (TaskCanceledException)
        {
            logger.LogWarning("✗ LLM health check timed out (>10 s) — server may still be loading");
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning("✗ LLM server is unreachable: {Message} — cached responses will be used", ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "✗ LLM health check failed unexpectedly");
        }
    }

    // ── TTS (piper-gateway) ───────────────────────────────────────────────────

    /// <summary>
    /// Probes the piper-gateway <c>GET /health</c> endpoint.
    /// Non-fatal: a missing TTS service should not prevent app startup
    /// because file-cached audio will still be served by the gateway itself.
    /// </summary>
    public static async Task CheckTtsConnectionAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var httpFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();

        var baseUrl = configuration["TtsApi:BaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            logger.LogWarning("TtsApi:BaseUrl is not configured — skipping TTS health check");
            return;
        }

        var healthUrl = baseUrl.TrimEnd('/') + "/health";
        logger.LogInformation("Checking TTS gateway health at {Url} ...", healthUrl);

        try
        {
            var http = httpFactory.CreateClient();
            http.Timeout = TimeSpan.FromSeconds(10);

            using var response = await http.GetAsync(healthUrl);
            var body = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                logger.LogInformation("✓ TTS gateway is reachable — {Body}", body);
            }
            else
            {
                logger.LogWarning(
                    "✗ TTS gateway returned HTTP {StatusCode}: {Body}",
                    (int)response.StatusCode, body);
            }
        }
        catch (TaskCanceledException)
        {
            logger.LogWarning("✗ TTS health check timed out (>10 s)");
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning("✗ TTS gateway is unreachable: {Message} — cached audio will still be served", ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "✗ TTS health check failed unexpectedly");
        }
    }
}