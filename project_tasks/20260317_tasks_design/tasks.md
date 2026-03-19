#### Additional: Cursor Pointer for Quiz List Actions
- **Implementation**: Identify `<span>` wrappers in `QuizListPage.vue`, apply class.

#### Continue Task 17: Settings – finalize UI and test theme switching.

### Frontend (Dev2)
#### Task 7: Review & Report (Frontend)
- **QuizPlayer.vue**: Add “Report Question” button (icon) near question. Click opens `ReportModal` with `targetType: 'quiz_question'`, `targetId: quizQuestionId`, `attemptId: currentAttemptId`.
- **AttemptReview.vue**:
  - Add “Report Quiz” button (top) with `targetType: 'quiz'`.
  - Add “Report Question” per question in review (similar to player).
- **ReportModal.vue**: Reusable modal with reason textarea, emits success.

### Backend (Dev1)
#### Task 8: Password Reset & Email Verification
- **Endpoints**:
  - `POST /api/auth/forgot-password` – generates token, stores in `password_reset_token` with expiry (UTC+1h), sends email.
  - `POST /api/auth/reset-password` – validates token, updates password hash, clears token, invalidates sessions.
  - `POST /api/auth/verify-email` – validates `email_verification_token`, sets `email_confirmed = true`.
  - `POST /api/auth/resend-verification` – generates new token, resends email.
- **Email templates**: HTML strings with placeholders; use `IEmailService`.
- **Rate limiting**: Extend `RateLimitingMiddleware` or use `[RateLimit]` attribute with Redis storage (5 per hour per email/IP).
- **Session invalidation**: Call `_sessionRepo.RevokeAllForUserAsync(userId)` after password reset.

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
