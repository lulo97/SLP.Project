# 4-Day Implementation Schedule

This schedule assumes a team of **4 developers** (2 backend, 2 frontend) working full-time. Tasks are grouped to maximize parallelization. Each task includes key design decisions and solutions to previously identified questions and conflicts.

---

## Day 1

#### Additional: Cursor Pointer for Quiz List Actions
- **Implementation**: Identify `<span>` wrappers in `QuizListPage.vue`, apply class.

---

## Day 2


### Backend (Dev2)


### Frontend (Dev1)
#### Task 5: Dashboard – Word of the Day
- **API**: `GET /api/dashboard/word-of-day`
  + Show a word with vietnamese definition + detail dictionary metadata
  + Origin of word
  + Examples of word
  + Fun fact about word
- **Store**: Add `dashboardStore` with `wordOfDay`, `loading`, `error`.
- **Component**: In `DashboardPage.vue` (design later)
- **Solution**: If no word, show fallback message.

### Frontend (Dev2)
#### Task 10: Quiz Edit – Notes & Sources
- **NotesSection**: Add edit button (pencil) emitting `edit` event. Parent (`QuizFormPage`) opens note modal in edit mode, calls `PUT /api/notes/{id}`.
- **SourcesSection**: Add view button (eye) emitting `view` event. Parent either navigates to source detail or opens `SourcePreviewModal`.
- **Modal**: Create `SourcePreviewModal.vue` that fetches source and displays truncated content (using TipTap render if available). Include “Read full source” button.
- **Store**: Add `updateNote` action in `quizStore` (or note store).

#### Task 11: Empty Quiz Attempt Prevention
- In `QuizDetailPage` and `QuizViewPage`, bind `:disabled="questions.length === 0"` to start attempt button. Add tooltip explaining why.
- No backend changes needed (backend will also validate).

---

## Day 3

### Backend (Dev1)
#### Task 7: Review & Report (Core Backend)
- **Database**:
  - Alter `report` table: add `attempt_id` (int, nullable FK to `quiz_attempt`). Add `target_type` check constraint to include `'quiz_question'`.
  - Add index on `target_type, target_id`.
- **Endpoints**:
  - `POST /api/reports` – creates report with `targetType`, `targetId`, `attemptId` (optional), `reason`. Validates target exists and (if attempt) belongs to user.
  - `GET /api/reports` (admin) – list with `resolved` filter.
  - `POST /api/reports/{id}/resolve` (admin).
  - `GET /api/reports/my` – user’s own reports (already done in Task 1, but can reuse).
- **Service**: Validate target existence: for `quiz_question`, check `QuizQuestion` exists; for `quiz`/`comment` use existing repos.
- **Admin actions**: In `AdminReports`, implement resolve, and direct moderation (delete comment, disable quiz) with corresponding service calls.

#### Continue Task 7: Also ensure `AdminReports` backend support for undo (Task 2) – will be done by backend Dev2? Actually Task 2 is separate, but we can combine.

### Backend (Dev2)
#### Task 19 (cont.) – finish LLM cache, test.
#### Task 18: Health Dashboard Backend
- **Controller**: `HealthDashboardController` with `[Authorize(Roles = "admin")]` and endpoint `GET /api/health/services`.
- **Implementation**: Parallel checks using `IHttpClientFactory` (HTTP) and `TcpClient` (TCP). Timeout 3 seconds.
- **Services to check**: Redis (port 6379), Mail (SMTP port), Backend (self, optional), Frontend (HTTP root), Llama (HTTP `/health`), Piper (TCP port), Piper Gateway (HTTP `/health`).
- **Response**: JSON with timestamp and array of `{ name, status, details, responseTimeMs }`.
- **Cache**: In-memory cache for 10 seconds to reduce load.

### Frontend (Dev1)
#### Task 2: Admin Reports – Resolved View & Undo
- **AdminReports.vue**: Add tabs for “Unresolved” (default) and “Resolved”.
- **Resolved tab**: Fetch from `GET /api/reports?resolved=true`. Display table with columns: ID, Reporter, Target, Reason, Resolved By, Resolved At, Undo button.
- **Undo**: Call `POST /api/reports/{id}/undo-resolve`, then refresh both tabs.
- **Actions**: For unresolved, add “Resolve” button (calls resolve endpoint) and direct moderation buttons (Delete Comment, Disable Quiz) – these will call existing admin endpoints.
- **Solution**: Undo allowed for any admin, logged in `admin_log`.

#### Task 4: Admin Mobile UI
- Use CSS media queries (`max-width: 768px`) to switch from `<a-table>` to card-based layout.
- For each admin tab (Users, Quizzes, Comments, Logs, Reports), create a mobile-friendly card component that shows essential info and actions.
- Ensure touch targets are ≥44px.

#### Continue Task 17: Settings – finalize UI and test theme switching.

### Frontend (Dev2)
#### Task 7: Review & Report (Frontend)
- **QuizPlayer.vue**: Add “Report Question” button (icon) near question. Click opens `ReportModal` with `targetType: 'quiz_question'`, `targetId: quizQuestionId`, `attemptId: currentAttemptId`.
- **AttemptReview.vue**:
  - Add “Report Quiz” button (top) with `targetType: 'quiz'`.
  - For each comment, add “Report” link (uses existing comment ID). CommentsSection already has report? Need to add if missing.
  - Optionally, add “Report Question” per question in review (similar to player).
- **ReportModal.vue**: Reusable modal with reason textarea, emits success.
- **AdminReports.vue** (already started by Frontend Dev1, but we can assist): ensure actions work.

---

## Day 4

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

### Backend (Dev2)
#### Assist with Task 21 or integration testing
- Help set up Redis and PostgreSQL metrics table.
- Write integration tests for new endpoints.
- Ensure all microservices are properly integrated.

### Frontend (Dev1)
#### Finish Task 17: Settings (i18n & theme)
- Complete translation of all UI strings (use a systematic approach: replace all hardcoded text in templates with `$t('key')`). Focus on major pages first.
- Test theme switching and persistence.
- Ensure dark mode works with both Ant Design and Tailwind.

#### Task 18: Health Dashboard Frontend
- New page `AdminHealth.vue` under `/admin/health`.
- Fetch data from `GET /api/health/services`, display cards with status and response time.
- Add refresh button and timestamp.
- Use Ant Design `<a-card>` and `<a-tag>` for status.

### Frontend (Dev2)
#### Task 15: Search Pagination
- In `SearchPage.vue`, remove infinite scroll logic (intersection observer).
- Enable existing `<a-pagination>` component (already in template but likely hidden). Bind to `searchStore.page`, `totalPages`, etc.
- Ensure page resets to 1 on new search or tab change.
- Add URL sync (optional): update query param `page` and read on mount.

#### Final Integration & Testing
- Run through all features, fix bugs.
- Ensure all API calls use correct endpoints.
- Test on mobile view.

---

## Summary of Design Decisions & Solutions

- **Report target type**: Added `'quiz_question'` to `report.target_type` check constraint; added `attempt_id` column.
- **LLM global cache**: Modified `llm_log` to allow `user_id NULL`, added unique partial index, updated repository query to include `user_id IS NULL`.
- **Note updates**: Notes are shared across quizzes; update affects all.
- **Source viewing**: Implement modal preview with option to navigate to full page.
- **Search “All” tab**: Remains limited to first 20 results; added UI hint.
- **TTS cache**: File-based cache in piper-gateway with configurable directory and `PIPER_ENABLED` flag.
- **Avatar storage**: Dedicated microservice with API key auth, files stored on Docker volume.
- **Pagination**: All list endpoints return `PaginatedResult`; frontend uses `<a-pagination>`.
- **Cursor pointer**: Added CSS class to action icons.
- **Email rate limiting**: Extended middleware to cover forgot-password and resend endpoints.
- **Admin undo report**: Allowed any admin to undo, logged in `admin_log`.

This schedule, with parallel tracks, allows completion of all 22 tasks within 4 days, assuming a 4-person team. Each day's work is clearly defined, and all design questions are resolved.