using backend_dotnet.Features.Health;
using Microsoft.Extensions.Caching.Memory;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;

namespace backend_dotnet.Features.Health;

public interface IHealthCheckService
{
    Task<HealthCheckResponse> GetHealthStatusAsync();
}

public class HealthCheckService : IHealthCheckService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IMemoryCache _cache;
    private readonly ILogger<HealthCheckService> _logger;
    private const string CacheKey = "HealthCheckStatus";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(10);

    public HealthCheckService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IMemoryCache cache,
        ILogger<HealthCheckService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _cache = cache;
        _logger = logger;
    }

    public async Task<HealthCheckResponse> GetHealthStatusAsync()
    {
        // Try cache
        if (_cache.TryGetValue(CacheKey, out HealthCheckResponse? cached) && cached != null)
        {
            return cached;
        }

        var checks = new List<Func<Task<ServiceHealthDto>>>
        {
            CheckRedis,
            CheckMail,
            CheckBackend,
            CheckFrontend,
            CheckLlama,
            CheckPiper,
            CheckPiperGateway
        };

        var tasks = checks.Select(check => RunWithTimeout(check, TimeSpan.FromSeconds(3)));
        var results = await Task.WhenAll(tasks);

        var response = new HealthCheckResponse
        {
            Timestamp = DateTime.UtcNow,
            Services = results.ToList()
        };

        // Cache
        _cache.Set(CacheKey, response, CacheDuration);
        return response;
    }

    private async Task<ServiceHealthDto> RunWithTimeout(Func<Task<ServiceHealthDto>> check, TimeSpan timeout)
    {
        using var cts = new CancellationTokenSource(timeout);
        try
        {
            return await check().WaitAsync(cts.Token);
        }
        catch (OperationCanceledException)
        {
            return new ServiceHealthDto
            {
                Name = ExtractNameFromDelegate(check),
                Status = "Unhealthy",
                Details = "Timeout after 3 seconds",
                ResponseTimeMs = (long)timeout.TotalMilliseconds
            };
        }
        catch (Exception ex)
        {
            return new ServiceHealthDto
            {
                Name = ExtractNameFromDelegate(check),
                Status = "Unhealthy",
                Details = ex.Message,
                ResponseTimeMs = 0
            };
        }
    }

    private string ExtractNameFromDelegate(Func<Task<ServiceHealthDto>> check)
    {
        // Hack to get a friendly name – we can improve by passing name separately
        return check.Method.Name switch
        {
            nameof(CheckRedis) => "Redis",
            nameof(CheckMail) => "Mail",
            nameof(CheckBackend) => "Backend",
            nameof(CheckFrontend) => "Frontend",
            nameof(CheckLlama) => "Llama",
            nameof(CheckPiper) => "Piper",
            nameof(CheckPiperGateway) => "Piper Gateway",
            _ => "Unknown"
        };
    }

    // Individual checks -------------------------------------------------

    private async Task<ServiceHealthDto> CheckRedis()
    {
        var start = DateTime.UtcNow;
        var host = _configuration["ConnectionStrings:Redis"]?.Split(':')[0] ?? "localhost";
        var port = 6379;

        try
        {
            using var client = new TcpClient();
            await client.ConnectAsync(host, port);
            var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;
            return new ServiceHealthDto
            {
                Name = "Redis",
                Status = "Healthy",
                Details = $"Connected to {host}:{port}",
                ResponseTimeMs = ms
            };
        }
        catch (Exception ex)
        {
            var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;
            return new ServiceHealthDto
            {
                Name = "Redis",
                Status = "Unhealthy",
                Details = ex.Message,
                ResponseTimeMs = ms
            };
        }
    }

    private async Task<ServiceHealthDto> CheckMail()
    {
        var start = DateTime.UtcNow;
        // SMTP port – adjust to your mail server
        var host = "mail"; // container name
        var port = 25; // SMTP

        try
        {
            using var client = new TcpClient();
            await client.ConnectAsync(host, port);
            var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;
            return new ServiceHealthDto
            {
                Name = "Mail",
                Status = "Healthy",
                Details = $"SMTP port {port} reachable",
                ResponseTimeMs = ms
            };
        }
        catch (Exception ex)
        {
            var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;
            return new ServiceHealthDto
            {
                Name = "Mail",
                Status = "Unhealthy",
                Details = ex.Message,
                ResponseTimeMs = ms
            };
        }
    }

    private async Task<ServiceHealthDto> CheckBackend()
    {
        var start = DateTime.UtcNow;
        // Self check – maybe /health endpoint if exists, otherwise just check that we can respond
        // Since this is the same service, we can just return a quick success
        await Task.Delay(1); // simulate minimal work
        var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;
        return new ServiceHealthDto
        {
            Name = "Backend",
            Status = "Healthy",
            Details = "Self check OK",
            ResponseTimeMs = ms
        };
    }

    private async Task<ServiceHealthDto> CheckFrontend()
    {
        var start = DateTime.UtcNow;
        var baseUrl = _configuration["Frontend:BaseUrl"] ?? "http://frontend-vue-container:3002"; // adjust
        var httpClient = _httpClientFactory.CreateClient();

        try
        {
            var response = await httpClient.GetAsync(baseUrl);
            var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;
            if (response.IsSuccessStatusCode)
            {
                return new ServiceHealthDto
                {
                    Name = "Frontend",
                    Status = "Healthy",
                    Details = $"HTTP {response.StatusCode}",
                    ResponseTimeMs = ms
                };
            }
            else
            {
                return new ServiceHealthDto
                {
                    Name = "Frontend",
                    Status = "Degraded",
                    Details = $"HTTP {response.StatusCode}",
                    ResponseTimeMs = ms
                };
            }
        }
        catch (Exception ex)
        {
            var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;
            return new ServiceHealthDto
            {
                Name = "Frontend",
                Status = "Unhealthy",
                Details = ex.Message,
                ResponseTimeMs = ms
            };
        }
    }

    private async Task<ServiceHealthDto> CheckLlama()
    {
        var start = DateTime.UtcNow;
        var baseUrl = _configuration["LlmApi:BaseUrl"];
        if (string.IsNullOrEmpty(baseUrl))
        {
            return new ServiceHealthDto
            {
                Name = "Llama",
                Status = "Unhealthy",
                Details = "LlmApi:BaseUrl not configured",
                ResponseTimeMs = 0
            };
        }

        var uri = new Uri(baseUrl);
        var healthUrl = $"{uri.Scheme}://{uri.Host}:{uri.Port}/health";
        var httpClient = _httpClientFactory.CreateClient();

        try
        {
            var response = await httpClient.GetAsync(healthUrl);
            var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return new ServiceHealthDto
                {
                    Name = "Llama",
                    Status = "Healthy",
                    Details = content,
                    ResponseTimeMs = ms
                };
            }
            else if ((int)response.StatusCode == 503)
            {
                return new ServiceHealthDto
                {
                    Name = "Llama",
                    Status = "Degraded",
                    Details = "Loading model (HTTP 503)",
                    ResponseTimeMs = ms
                };
            }
            else
            {
                return new ServiceHealthDto
                {
                    Name = "Llama",
                    Status = "Unhealthy",
                    Details = $"HTTP {response.StatusCode}",
                    ResponseTimeMs = ms
                };
            }
        }
        catch (Exception ex)
        {
            var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;
            return new ServiceHealthDto
            {
                Name = "Llama",
                Status = "Unhealthy",
                Details = ex.Message,
                ResponseTimeMs = ms
            };
        }
    }

    private async Task<ServiceHealthDto> CheckPiper()
    {
        var start = DateTime.UtcNow;
        // Piper uses Wyoming protocol on TCP, but we just check port connectivity
        var host = _configuration["Piper:Host"] ?? "piper";
        var port = int.Parse(_configuration["Piper:Port"] ?? "3004");

        try
        {
            using var client = new TcpClient();
            await client.ConnectAsync(host, port);
            var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;
            return new ServiceHealthDto
            {
                Name = "Piper",
                Status = "Healthy",
                Details = $"Connected to {host}:{port}",
                ResponseTimeMs = ms
            };
        }
        catch (Exception ex)
        {
            var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;
            return new ServiceHealthDto
            {
                Name = "Piper",
                Status = "Unhealthy",
                Details = ex.Message,
                ResponseTimeMs = ms
            };
        }
    }

    private async Task<ServiceHealthDto> CheckPiperGateway()
    {
        var start = DateTime.UtcNow;
        var baseUrl = _configuration["TtsApi:BaseUrl"];
        if (string.IsNullOrEmpty(baseUrl))
        {
            return new ServiceHealthDto
            {
                Name = "Piper Gateway",
                Status = "Unhealthy",
                Details = "TtsApi:BaseUrl not configured",
                ResponseTimeMs = 0
            };
        }

        var healthUrl = baseUrl.TrimEnd('/') + "/health";
        var httpClient = _httpClientFactory.CreateClient();

        try
        {
            var response = await httpClient.GetAsync(healthUrl);
            var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return new ServiceHealthDto
                {
                    Name = "Piper Gateway",
                    Status = "Healthy",
                    Details = content,
                    ResponseTimeMs = ms
                };
            }
            else
            {
                return new ServiceHealthDto
                {
                    Name = "Piper Gateway",
                    Status = "Unhealthy",
                    Details = $"HTTP {response.StatusCode}",
                    ResponseTimeMs = ms
                };
            }
        }
        catch (Exception ex)
        {
            var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;
            return new ServiceHealthDto
            {
                Name = "Piper Gateway",
                Status = "Unhealthy",
                Details = ex.Message,
                ResponseTimeMs = ms
            };
        }
    }
}