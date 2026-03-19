using backend_dotnet.Features.Metrics;
using System.Diagnostics;

namespace backend_dotnet.Middlewares;

public class MetricsMiddleware
{
    private readonly RequestDelegate _next;

    // Logger injected via constructor (singleton-safe)
    public MetricsMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context, IMetricsCollector collector)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();
            // Fire-and-forget — we deliberately do not await to keep latency impact minimal
            _ = collector.RecordRequestAsync(
                path: context.Request.Path.Value ?? "/",
                method: context.Request.Method,
                statusCode: context.Response.StatusCode,
                latencyMs: sw.Elapsed.TotalMilliseconds);
        }
    }
}