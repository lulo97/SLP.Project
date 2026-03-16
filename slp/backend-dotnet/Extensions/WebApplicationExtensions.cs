using System.Text;
using System.Text.Json;
using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace backend_dotnet.Extensions;

public static class WebApplicationExtensions
{
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

            if (result != null && Convert.ToInt32(result) == 1)
            {
                logger.LogInformation("✓ Database connection successful");
            }
            else
            {
                throw new Exception("Database query returned unexpected result. Connection string = " + connectionString);
            }

            // Optional: check users table accessibility
            try
            {
                var canQueryUsers = await dbContext.Database
                    .ExecuteSqlRawAsync("SELECT 1 FROM users LIMIT 1") >= 0;
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
            throw; // Fail fast if DB not available
        }
    }

    /// <summary>
    /// Sends a minimal "hi" message to the local LLM server and logs the first
    /// few words of the reply. Non-fatal — a failure is logged as a warning so
    /// the app still starts normally when the LLM server is offline.
    /// </summary>
    public static async Task CheckLlmConnectionAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var httpFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();

        var baseUrl = configuration["LlmApi:BaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            logger.LogWarning("LlmApi:BaseUrl is not configured — skipping LLM health check");
            return;
        }

        logger.LogInformation("Checking LLM server connection at {Url} ...", baseUrl);

        try
        {
            var payload = new
            {
                messages = new[] { new { role = "user", content = "hi" } },
                stream = true,
                return_progress = false,
                temperature = 0.8,
                max_tokens = 50
            };

            var bodyJson = JsonSerializer.Serialize(payload);
            using var request = new HttpRequestMessage(HttpMethod.Post, baseUrl)
            {
                Content = new StringContent(bodyJson, Encoding.UTF8, "application/json")
            };

            var http = httpFactory.CreateClient();
            http.Timeout = TimeSpan.FromSeconds(15);

            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning(
                    "✗ LLM server returned HTTP {StatusCode} — server may be loading a model",
                    (int)response.StatusCode);
                return;
            }

            // Read the SSE stream just long enough to get the first content fragment
            await using var stream = await response.Content.ReadAsStreamAsync();
            using var reader = new StreamReader(stream, Encoding.UTF8);

            var previewBuilder = new StringBuilder();
            var chunksRead = 0;

            while (!reader.EndOfStream && chunksRead < 30)
            {
                var line = await reader.ReadLineAsync();
                if (line is null || !line.StartsWith("data: ", StringComparison.Ordinal))
                    continue;

                var data = line["data: ".Length..].Trim();
                if (data == "[DONE]") break;
                if (string.IsNullOrEmpty(data)) continue;

                try
                {
                    using var doc = JsonDocument.Parse(data);
                    var root = doc.RootElement;

                    if (root.TryGetProperty("choices", out var choices) &&
                        choices.GetArrayLength() > 0)
                    {
                        var choice = choices[0];
                        var deltaEl = choice.TryGetProperty("delta", out var d) ? d
                                      : choice.TryGetProperty("message", out var m) ? m
                                      : (JsonElement?)null;

                        if (deltaEl.HasValue &&
                            deltaEl.Value.TryGetProperty("content", out var contentEl) &&
                            contentEl.ValueKind == JsonValueKind.String)
                        {
                            previewBuilder.Append(contentEl.GetString());
                        }
                    }
                }
                catch (JsonException) { /* skip malformed chunk */ }

                chunksRead++;
            }

            var preview = previewBuilder.ToString().Trim();
            if (preview.Length > 80)
                preview = preview[..80] + "…";

            logger.LogInformation(
                "✓ LLM server is reachable — response preview: \"{Preview}\"", preview);
        }
        catch (TaskCanceledException)
        {
            logger.LogWarning("✗ LLM server health check timed out (>{Timeout}s) — server may still be loading", 15);
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning("✗ LLM server is unreachable: {Message}", ex.Message);
        }
        catch (Exception ex)
        {
            // Catch any other unexpected errors (e.g., JSON serialization, stream reading)
            logger.LogWarning(ex, "✗ LLM server health check failed unexpectedly");
        }
    }
}