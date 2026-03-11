using backend_dotnet.Data;
using backend_dotnet.Features.Auth;
using backend_dotnet.Features.Email;
using backend_dotnet.Features.Session;
using backend_dotnet.Features.User;
using backend_dotnet.Middlewares;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ISessionRepository, SessionRepository>();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddHttpClient<IEmailService, EmailService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("Email"));
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "SampleApp";
});
builder.Services.AddAuthentication("Session")
    .AddScheme<AuthenticationSchemeOptions, DummyAuthHandler>("Session", null);
builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins("http://localhost:3002")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Perform database connection check at startup
await CheckDatabaseConnectionAsync(app.Services);

app.UseCors("Frontend");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseMiddleware<RateLimitingMiddleware>();
app.UseMiddleware<SessionMiddleware>();

app.UseAuthorization();

app.MapControllers();

app.Run();

// Database connection check method
async Task CheckDatabaseConnectionAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    try
    {
        logger.LogInformation("Checking database connection...");

        // Try to open a raw connection and execute a simple query
        var connectionString = configuration.GetConnectionString("Default");
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // Execute a simple query to verify the connection is fully functional
        await using var command = new NpgsqlCommand("SELECT 1", connection);
        var result = await command.ExecuteScalarAsync();

        if (result != null && Convert.ToInt32(result) == 1)
        {
            logger.LogInformation("✓ Database connection successful");
        }
        else
        {   
            throw new Exception("Database query returned unexpected result. Connect string = " + connectionString);
        }

        // Optionally check if we can query the users table
        try
        {
            var canQueryUsers = await dbContext.Database
                .ExecuteSqlRawAsync("SELECT 1 FROM users LIMIT 1") >= 0;
            logger.LogInformation("✓ Users table is accessible");
        }
        catch (Exception ex)
        {
            logger.LogWarning("Users table may not exist yet: {Message}", ex.Message);
            // This might be expected if migrations haven't run yet
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "✗ Database connection failed!");
        logger.LogError("Please check: 1. PostgreSQL is running 2. Connection string is correct 3. Database exists");

        // You can choose to either:
        // Option 1: Throw and prevent app from starting
        throw new Exception("Application failed to start due to database connection error", ex);

        // Option 2: Log warning but continue (uncomment below and comment out throw above if you prefer)
        // logger.LogWarning("Application will continue but database features may not work properly");
    }
}