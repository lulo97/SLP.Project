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
}