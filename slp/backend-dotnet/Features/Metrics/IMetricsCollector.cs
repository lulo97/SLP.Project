namespace backend_dotnet.Features.Metrics;

public interface IMetricsCollector
{
    Task RecordRequestAsync(string path, string method, int statusCode, double latencyMs);
}