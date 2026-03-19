using backend_dotnet.Extensions;
using backend_dotnet.Features.Source;
using backend_dotnet.Middlewares;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

builder.Services.AddControllers();
builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddCaching(builder.Configuration);
builder.Services.AddAuthAndCors(builder.Configuration);
builder.Services.AddFileStorage(builder.Configuration);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddMemoryCache();
builder.Services.AddApiMetrics();

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

// ── Startup health checks (all non-fatal except DB) ───────────────────────────
await app.CheckDatabaseConnectionAsync();   // fatal — app cannot run without DB
await app.CheckLlmConnectionAsync();        // non-fatal — cached responses still work
await app.CheckTtsConnectionAsync();        // non-fatal — cached audio still works

// ── Middleware pipeline ───────────────────────────────────────────────────────
app.UseCors("Frontend");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseMiddleware<RateLimitingMiddleware>();
app.UseMiddleware<MetricsMiddleware>();
app.UseMiddleware<SessionMiddleware>();
app.UseAuthorization();
app.MapControllers();

app.Run();