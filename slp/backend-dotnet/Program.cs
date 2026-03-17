using backend_dotnet.Extensions;
using backend_dotnet.Features.Source;
using backend_dotnet.Middlewares;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Add services
builder.Services.AddControllers();
builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddCaching(builder.Configuration);
builder.Services.AddAuthAndCors(builder.Configuration);
builder.Services.AddFileStorage(builder.Configuration);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHttpClient<IParserClient, ParserClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["ParserService:BaseUrl"]);
    client.Timeout = TimeSpan.FromSeconds(30);
});

var app = builder.Build();

if (app.Environment.IsDevelopment() || true)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Check database connection at startup
await app.CheckDatabaseConnectionAsync();

// Check LLM server at startup (non-fatal)
await app.CheckLlmConnectionAsync();

// Middleware pipeline
app.UseCors("Frontend");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseMiddleware<RateLimitingMiddleware>();
app.UseMiddleware<SessionMiddleware>();
app.UseAuthorization();
app.MapControllers();

app.Run();