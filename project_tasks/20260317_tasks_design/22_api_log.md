## Design: HTTP API for System Metrics and Logs

### 1. Overview
We need a secure HTTP API that provides insight into system health, performance, and activity. This will support:
- Real‑time monitoring and debugging
- Capacity planning
- Admin dashboards

The API will expose two categories of data:
- **Metrics**: numerical time‑series data (request rates, error counts, queue sizes, LLM usage)
- **Logs**: structured application logs with filtering

### 2. Goals
- Minimal performance overhead
- Secure access (admin only)
- Flexible time‑range queries
- Extensible for new metrics
- Integrate with existing components (Serilog, Redis, PostgreSQL)

### 3. Proposed Metrics
| Category        | Examples                                     |
|-----------------|----------------------------------------------|
| HTTP traffic    | requests per endpoint, status codes, latency |
| Business        | user registrations, quizzes created, attempts |
| LLM             | calls, tokens, cache hits/misses             |
| Queue           | job counts (pending, processing, failed)     |
| External        | mail, piper, llama connectivity               |
| System (optional) | memory, CPU (if available)                   |

### 4. Data Collection
- **HTTP middleware** to capture per‑request data (method, path, status, duration) and emit to a metrics store.
- **Application code** will increment counters for business events (e.g., `LlmLog` already recorded; we can aggregate).
- **Background service** to periodically compute aggregates (e.g., average latency over 5 min) and prune old data.
- **Health checks** already exist (`CheckDatabaseConnectionAsync`, `CheckLlmConnectionAsync`); they can be exposed as metrics.

### 5. Storage Options
We have two viable choices:

#### Option A: Redis (lightweight, short‑term)
- Store counters and histograms in Redis sorted sets or hashes.
- Use time‑series keys like `metric:requests:total`, `metric:latency:p95`.
- Good for recent data (e.g., last 24h) and fast queries.

#### Option B: PostgreSQL (durable, long‑term)
- Create a `metrics` table with columns: `name`, `timestamp`, `value`, `tags` (JSONB).
- Partition by time for performance.
- Existing logs table can be extended with indexes for efficient filtering.

**Recommendation**: Use Redis for high‑frequency metrics (requests) and PostgreSQL for aggregated business metrics and logs. For simplicity, start with Redis and optionally persist to PostgreSQL later.

### 6. API Design

#### Base URL: `/api/admin/metrics` (admin‑only)

| Endpoint                     | Method | Description                                      | Parameters                                                                 |
|------------------------------|--------|--------------------------------------------------|----------------------------------------------------------------------------|
| `/requests`                  | GET    | Request counts grouped by endpoint/time          | `from`, `to`, `interval` (minute/hour/day), `endpoint` (optional)         |
| `/errors`                    | GET    | Error counts by status code                      | same as above                                                              |
| `/latency`                   | GET    | Percentile latency (p50, p95, p99)               | `from`, `to`, `percentiles` (comma‑separated)                             |
| `/llm`                       | GET    | LLM usage (calls, tokens, cache)                 | `from`, `to`                                                               |
| `/queue`                     | GET    | Queue job counts by status                        | –                                                                          |
| `/health`                    | GET    | Current health status of dependencies            | –                                                                          |
| `/logs` (existing, extended) | GET    | Structured logs                                  | `level`, `from`, `to`, `limit`, `search` (keyword)                         |

All responses return JSON. Example:

```json
GET /api/admin/metrics/requests?from=2025-03-17T00:00Z&to=2025-03-17T23:59Z&interval=hour
{
  "interval": "hour",
  "data": [
    { "timestamp": "2025-03-17T00:00Z", "total": 120, "byEndpoint": { "/api/auth/login": 30, ... } },
    ...
  ]
}
```

### 7. Security
- All endpoints require authentication with the `admin` role (already implemented).
- Use `X-Session-Token` header (same as other APIs).
- Rate‑limit the metrics endpoints to prevent abuse (e.g., 10 requests per minute per admin).

### 8. Integration with Existing Code
- **Middleware**: Add `MetricsMiddleware` that records request start/finish and pushes to `IMetricsCollector`.
- **MetricsCollector**: Interface with methods like `RecordRequest(string method, string path, int status, long durationMs)`, `IncrementCounter(string name, Dictionary<string,string> tags)`. Implementation can write to Redis.
- **Background Service**: `MetricsAggregator` runs every minute, computes percentiles from raw data, and stores aggregates.
- **AdminService**: Extend with methods to query metrics and return DTOs.
- **Serilog**: Already logs to file; we can also forward logs to Redis/PostgreSQL via a custom sink if we want them in the API.

### 9. Frontend Considerations
- Add a new tab in the existing Admin panel (e.g., "Metrics") that displays charts using a library like Chart.js.
- Reuse the same API endpoints.

### 10. Future Enhancements
- Expose Prometheus‑compatible endpoint for integration with external monitoring tools.
- Add alerting rules based on metric thresholds.
- Store longer‑term metrics in a time‑series DB (e.g., InfluxDB) for advanced analytics.

### 11. Summary
This design adds a lightweight, admin‑protected metrics API that leverages existing infrastructure (Redis, PostgreSQL) and code patterns. It provides essential system observability without requiring new external services, and can be extended as needs grow.