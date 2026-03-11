using backend_dotnet.Data;
using backend_dotnet.Features.Email;
using backend_dotnet.Features.Session;
using backend_dotnet.Features.User;
using backend_dotnet.Middlewares;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

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
builder.Services.AddAuthorization();

var app = builder.Build();

app.UseHttpsRedirection();

app.UseMiddleware<RateLimitingMiddleware>();
app.UseMiddleware<SessionMiddleware>();

app.UseAuthorization();

app.MapControllers();

app.Run();