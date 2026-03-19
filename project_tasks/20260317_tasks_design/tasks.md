#### Additional: Cursor Pointer for Quiz List Actions
- **Implementation**: Identify `<span>` wrappers in `QuizListPage.vue`, apply class.

### Backend (Dev1)

#### Task 21: API Metrics Backend
- **Middleware**: `MetricsMiddleware` records request start/finish, pushes to `IMetricsCollector`.
- **MetricsCollector** (Redis implementation): For each request, increment counters in Redis sorted sets by minute (e.g., `metric:requests:2025-03-20T10:35`). Store latency in a list.
- **Background service**: Every minute, read raw data, compute aggregates (counts, p95 latency), store in PostgreSQL `metrics` table (new table: `id`, `name`, `timestamp`, `value`, `tags`).
- **Endpoints** (admin only):
  - `GET /api/admin/metrics/requests?from=&to=&interval=`
  - `GET /api/admin/metrics/errors`
  - `GET /api/admin/metrics/latency`
- **Solution**: Use Redis for short-term, PostgreSQL for long-term.

### Frontend (Dev1)

### Frontend (Dev2)
#### Task 15: Search Pagination
- In `SearchPage.vue`, remove infinite scroll logic (intersection observer).
- Enable existing `<a-pagination>` component (already in template but likely hidden). Bind to `searchStore.page`, `totalPages`, etc.
- Ensure page resets to 1 on new search or tab change.
- Add URL sync (optional): update query param `page` and read on mount.
