using backend_dotnet.Data;
using backend_dotnet.Features.Auth;
using backend_dotnet.Features.Email;
using backend_dotnet.Features.Explanation;
using backend_dotnet.Features.Favorite;
using backend_dotnet.Features.Llm;
using backend_dotnet.Features.Progress;
using backend_dotnet.Features.Question;
using backend_dotnet.Features.Queue;
using backend_dotnet.Features.Quiz;
using backend_dotnet.Features.QuizAttempt;
using backend_dotnet.Features.Session;
using backend_dotnet.Features.Source;
using backend_dotnet.Features.Tag;
using backend_dotnet.Features.User;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace backend_dotnet.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContextPool<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Default")));

        // Repositories
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ISessionRepository, SessionRepository>();
        services.AddScoped<IQuizRepository, QuizRepository>();
        services.AddScoped<IQuestionRepository, QuestionRepository>();
        services.AddScoped<ISourceRepository, SourceRepository>();
        services.AddScoped<ITagRepository, TagRepository>();
        services.AddScoped<IAttemptRepository, AttemptRepository>();
        services.AddScoped<IAttemptService, AttemptService>();
        services.AddScoped<IExplanationRepository, ExplanationRepository>();
        services.AddScoped<IExplanationService, ExplanationService>();
        services.AddScoped<IProgressRepository, ProgressRepository>();
        services.AddScoped<IProgressService, ProgressService>();
        services.AddScoped<IFavoriteRepository, FavoriteRepository>();
        services.AddScoped<IFavoriteService, FavoriteService>();

        // LLM – use AddHttpClient to register ILlmService (transient) with HttpClient
        services.AddHttpClient<ILlmService, LlmService>();
        services.AddScoped<ILlmLogRepository, LlmLogRepository>();

        return services;
    }

    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Core services
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IQuizService, QuizService>();
        services.AddScoped<IQuestionService, QuestionService>();
        services.AddScoped<ISourceService, SourceService>();

        // Email service with HttpClient
        services.AddHttpClient<IEmailService, EmailService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
        });
        services.Configure<EmailSettings>(configuration.GetSection("Email"));

        return services;
    }

    public static IServiceCollection AddCaching(this IServiceCollection services, IConfiguration configuration)
    {
        // Redis queue (only if enabled)
        if (configuration.GetValue<bool>("Queue:Enabled"))
        {
            var redisConnectionString = configuration["ConnectionStrings:Redis"];
            services.AddSingleton<IConnectionMultiplexer>(sp =>
                ConnectionMultiplexer.Connect(redisConnectionString));
            services.AddSingleton<IQueueService, RedisQueueService>();
            services.AddHostedService<BackgroundJobProcessor>();
        }
        else
        {
            // No-op queue service when disabled
            services.AddSingleton<IQueueService, NullQueueService>();
        }

        // Distributed cache (optional – uses Redis as cache)
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = configuration.GetConnectionString("Redis");
            options.InstanceName = "SampleApp";
        });

        return services;
    }

    public static IServiceCollection AddAuthAndCors(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddAuthentication("Session")
            .AddScheme<AuthenticationSchemeOptions, DummyAuthHandler>("Session", null);
        services.AddAuthorization();

        services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                policy.AllowAnyOrigin()
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        return services;
    }
}