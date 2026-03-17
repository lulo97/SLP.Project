22. Implement a health simple service to view all other service status UI/UX on vps

## 22. Design: Simple Health Service Dashboard for VPS

### 1. Overview

Add a lightweight health monitoring dashboard to the existing system that provides a unified view of all services running on the VPS. The dashboard will be accessible only to administrators and will display the current status (healthy/unhealthy) of each service, along with basic details. This helps operators quickly identify failing components.

**Approach**: Extend the existing `.NET` backend with a new controller that performs health checks on all services. The frontend Vue app will add an admin-only page that consumes this API and presents the status in a clean, responsive UI.

### 2. Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend Vue  │ ──────→ │  Backend .NET   │ ──────→ │  Redis / Mail   │
│ (Admin Page)    │   REST   │  (Health API)   │   TCP   │  Llama / Piper  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                     │
                                     │ HTTP
                                     ↓
                            ┌─────────────────┐
                            │ Piper Gateway   │
                            └─────────────────┘
```

- **Backend** exposes a secured endpoint `/api/health/services`.
- The endpoint queries all other services using **HTTP** (for services with web APIs) or **TCP** (for services like Redis, SMTP, Piper TCP server).
- Results are returned as JSON.
- **Frontend** fetches this data on the admin health page and renders it.

### 3. Services to Monitor

Based on the provided `docker-compose` snippet:

| Service          | Type   | Check Method                          | Endpoint / Port                      |
|------------------|--------|---------------------------------------|--------------------------------------|
| Redis            | TCP    | Connect to port                       | `redis:6379`                         |
| Mail             | TCP    | Connect to port (SMTP)                | `mail:{MAIL_PORT}`                   |
| Backend .NET     | HTTP   | GET `/health` (existing)              | `http://backend-dotnet-container:3001/health` |
| Frontend Vue     | HTTP   | GET root `/`                          | `http://frontend-vue-container:{VITE_FRONTEND_PORT}` |
| Llama (llama.cpp)| HTTP   | GET `/health` (if available) or `/`   | `http://llama-container:{LLAMA_PORT}` |
| Piper (TCP)      | TCP    | Connect to port                        | `piper:{PIPER_PORT}`                 |
| Piper Gateway    | HTTP   | GET `/health` (existing)               | `http://piper-gateway:{GATEWAY_INTERNAL_PORT}/health` |

*Note*: If a service does not have a dedicated health endpoint, a simple TCP connection or a GET on the root (expecting 200 OK) is sufficient for basic availability.

### 4. Backend API Design

**Endpoint**: `GET /api/health/services`  
**Authorization**: `[Authorize(Roles = "admin")]`  
**Response**:

```json
{
  "timestamp": "2025-04-01T12:34:56Z",
  "services": [
    {
      "name": "Redis",
      "status": "healthy",        // "healthy", "unhealthy", "unknown"
      "details": "Connected",
      "responseTimeMs": 5
    },
    {
      "name": "Mail",
      "status": "unhealthy",
      "details": "Connection refused",
      "responseTimeMs": null
    },
    ... 
  ]
}
```

**Implementation**:
- Use `Task.WhenAll` to run checks in parallel.
- For HTTP checks: use `IHttpClientFactory` with a short timeout (3 seconds).
- For TCP checks: use `TcpClient.ConnectAsync` with a timeout (3 seconds).
- Cache results in memory for, say, 10 seconds to avoid overloading services on frequent page refreshes.

**Example Controller Snippet** (conceptual):

```csharp
[Authorize(Roles = "admin")]
[HttpGet("services")]
public async Task<IActionResult> GetServicesHealth()
{
    var tasks = new List<Task<ServiceHealth>>();
    tasks.Add(CheckTcp("Redis", "redis", 6379));
    tasks.Add(CheckTcp("Mail", "mail", int.Parse(_config["MAIL_PORT"])));
    tasks.Add(CheckHttp("Backend", $"http://backend-dotnet-container:3001/health"));
    tasks.Add(CheckHttp("Frontend", $"http://frontend-vue-container:{_config["VITE_FRONTEND_PORT"]}/"));
    tasks.Add(CheckHttp("Llama", $"http://llama-container:{_config["LLAMA_PORT"]}/health"));
    tasks.Add(CheckTcp("Piper", "piper", int.Parse(_config["PIPER_PORT"])));
    tasks.Add(CheckHttp("Piper Gateway", $"http://piper-gateway:{_config["GATEWAY_INTERNAL_PORT"]}/health"));

    var results = await Task.WhenAll(tasks);
    return Ok(new { timestamp = DateTime.UtcNow, services = results });
}
```

### 5. Frontend UI/UX Design

**Location**: Add a new page under the admin section, e.g., `/admin/health`. The existing `RightSidebar.vue` already has an "Admin" menu item; we can extend that to show a dropdown or simply add a direct link to `/admin/health`.

**UI Components** (using Ant Design Vue):
- A page title: "System Health"
- A refresh button (manual) and a timestamp of last update.
- A grid of cards (one per service) with:
  - Service name (e.g., "Redis")
  - Status indicator: a colored tag (`<a-tag color="green">Healthy</a-tag>` or red/orange)
  - Details (e.g., "Connected", "Connection refused")
  - Response time (if applicable)
- Optionally, a compact table view for many services.

**Mockup**:

```
┌─────────────────────────────────────────────┐
│  System Health                    ⟲ Refresh │
│  Last updated: 2025-04-01 12:34:56          │
├─────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌────────┐
│ │ Redis        │ │ Mail         │ │ Llama  │
│ │ ● Healthy    │ │ ✗ Unhealthy  │ │ ● Heal │
│ │ 5ms          │ │ Conn refused │ │ 120ms  │
│ └──────────────┘ └──────────────┘ └────────┘
│ ...                                            │
└─────────────────────────────────────────────┘
```

**Implementation**:
- Create a new Vue component `AdminHealth.vue` under `src/features/admin/pages/`.
- Add route in `router/index.ts` with `meta: { requiresAuth: true, requiresAdmin: true }`.
- Use `apiClient` to fetch data from `/api/health/services` on mount and on refresh.
- Display loading spinner while fetching.

### 6. Security

- The health API is protected by role-based authorization – only users with `admin` role can access it.
- The endpoint does not expose sensitive information (only service names and basic status).
- No write operations are performed.

### 7. Deployment Considerations

- The backend container must be able to resolve the service names (`redis`, `mail`, etc.) via Docker’s internal DNS. This works automatically when all containers are on the same user-defined bridge network.
- Environment variables for ports (`MAIL_PORT`, `LLAMA_PORT`, etc.) should be passed to the backend container (they already are via `.env`).
- If any service is disabled (e.g., `piper` not running), the health check will gracefully handle timeouts and return `unhealthy`.

### 8. Potential Enhancements (Optional)

- Add a system load indicator (CPU/memory) for the host using `System.Diagnostics` or by reading `/proc/stat` inside the container (requires mounting host filesystem). This is more complex and may not be needed.
- Allow toggling services on/off (e.g., restart a container) – this would require Docker socket access and is **not recommended** for security reasons.
- Store health history in a database to show uptime trends (overkill for a simple VPS).

### 9. Summary of Changes

| Component          | Changes |
|--------------------|---------|
| Backend (.NET)     | Add `HealthDashboardController` with `/api/health/services`; inject `IHttpClientFactory` and `IConfiguration`; implement parallel checks. |
| Frontend (Vue)     | Add `AdminHealth.vue` page; register route `/admin/health`; call new API; display cards. |
| Authorization      | Ensure the endpoint requires `admin` role. |
| Docker Compose     | (No changes needed – all services already on same network). |

This design provides a simple, self‑contained health dashboard with minimal overhead, using existing components and preserving the lightweight nature of the VPS.