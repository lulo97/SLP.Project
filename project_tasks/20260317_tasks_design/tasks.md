# 4-Day Implementation Schedule

This schedule assumes a team of **4 developers** (2 backend, 2 frontend) working full-time. Tasks are grouped to maximize parallelization. Each task includes key design decisions and solutions to previously identified questions and conflicts.

---

## Day 1

### Backend (Dev1)
#### Task 13: Question Pagination
- **Endpoint**: `GET /api/question` now accepts `page` (default 1) and `pageSize` (default 20, max 50).
- **Response**: `PaginatedResult<QuestionListDto>` with `items`, `total`, `page`, `pageSize`, `totalPages`.
- **Repository**: Add `skip`/`take` to `SearchAsync`, return `(IEnumerable<Question>, int totalCount)`.
- **Service**: Update `SearchQuestionsAsync` to use pagination.
- **Solution**: Use existing filters; ensure count query is efficient (indexes on `user_id`, `type`, `updated_at`).

#### Task 9: Quiz List Pagination
- **Endpoint**: `GET /api/quiz` extended with `page`, `limit`, `sort`, `order`, `visibility`, `search`, `mine`.
- **Response**: Same paginated structure.
- **Repository**: Apply `Skip`/`Take` after filters.
- **Service**: Respect `mine` flag and visibility rules.
- **Solution**: Default sort by `createdAt DESC`. For public list, exclude disabled quizzes.

### Backend (Dev2)
#### Task 14: Source Parser Microservice
- **New service**: `parser` (Python FastAPI).
- **Endpoints**:
  - `POST /parse/url` – JSON `{ url, title? }` → returns `{ title, raw_text, raw_html, content_json?, metadata }`
  - `POST /parse/file` – multipart `file` → returns `{ title (if extracted), raw_text, content_json?, metadata }`
- **Libraries**: `trafilatura` (HTML), `pypdf` (PDF), `python-magic` (MIME).
- **Security**: Validate URL (no private IPs), file size (PDF ≤20MB, TXT ≤5MB), MIME type.
- **Docker**: Add to `docker-compose.yml` with internal network, expose port 8000, set env `MAX_FILE_SIZE`, `REQUEST_TIMEOUT`.
- **Backend integration**: Modify `SourceService` to call this service when creating URL/file source, store returned data.

#### Task 16: Avatar File Storage Microservice
- **New service**: `filestorage` (Python FastAPI).
- **Endpoints**:
  - `POST /upload` – multipart `file`, returns `{ url: "http://filestorage:8000/files/{uuid}.ext" }`
  - `GET /files/{filename}` – serves file
  - `DELETE /files/{filename}` – deletes file
- **Storage**: Files saved on mounted Docker volume, named with UUID.
- **Allowed formats**: JPEG, PNG; max 2MB.
- **Security**: API key for upload/delete
- **Backend integration**: New `IFileStorageClient` with methods `UploadAvatarAsync`, `DeleteFileAsync`. Add `avatar_url` column to `users` table.
- **Docker**: Add service to compose, volume `filestorage_data`.

### Frontend (Dev1)
#### Task 13 & 9: Pagination UI
- **Store**: Add pagination state (`currentPage`, `pageSize`, `total`) to `questionStore` and `quizStore`.
- **Actions**: Modify `fetch` methods to accept `page` and `pageSize`, update state.
- **Components**: Add `<a-pagination>` below lists, conditionally visible.
- **Reset logic**: On filter/tab change, reset page to 1.
- **Cursor fix**: Add CSS class `.action-icon { cursor: pointer; }` to action icon wrappers.

#### Additional: Cursor Pointer for Quiz List Actions
- **Implementation**: Identify `<span>` wrappers in `QuizListPage.vue`, apply class.

### Frontend (Dev2)
#### Task 6: Breadcrumb Component
- **Component**: `Breadcrumb.vue` using Ant Design `<a-breadcrumb>`.
- **Props**: `items: Array<{ label: string; path?: string }>`, `maxItems` (default 3) with truncation logic.
- **Integration**: Replace static title in `MobileLayout`’s `#header-left` slot on pages that need breadcrumbs.
- **Pages**: Dashboard, Quiz list, Quiz detail, Quiz edit, Question list, Source list, Source detail, Search, Admin.

#### Task 12: Tag Selector Component
- **Store**: `tagStore` with `tags` array, `fetchTags()` (cached).
- **Component**: `TagSelector.vue` – wraps Ant Design `<a-select mode="tags">`, binds `v-model`, loads options from store, shows loading/error.
- **Usage**: Replace existing tag selects in `QuizFormPage` and `QuestionFormPage`.
- **Solution**: Prevents duplicate tags in selection, max 10 tags enforced (frontend + backend later).

#### Start Task 17: Settings (store & i18n)
- **Store**: `settingsStore` with `theme` (light/dark), `language` (string), persistence to localStorage.
- **i18n**: Install `vue-i18n`, create basic locale files (`en.json`, `vi.json`) with a few strings.
- **Setup**: Integrate i18n in `main.ts`, provide to app.

---

## Day 2

### Backend (Dev1)
#### Task 1: User Reports Page
- **Endpoints**:
  - `GET /api/user/reports` – returns current user’s reports (ordered by `created_at DESC`)
  - `DELETE /api/user/reports/{id}` – hard delete if `resolved = false` and ownership matches.
- **Repository**: Add `GetByUserIdAsync`, `DeleteAsync` with check.
- **Service**: Enforce resolved check.
- **Solution**: No new table; existing `report` table used. Add index on `user_id` if missing.

#### Task 3: Comment History
- **New table**: `comment_history` (`id`, `comment_id`, `content`, `edited_at`). Foreign key `ON DELETE CASCADE`.
- **Backend**:
  - On comment update: save current content to history before applying new.
  - On comment create: optionally save initial version.
  - Endpoint `GET /api/comments/{id}/history` (owner/admin only).
- **Repository**: `AddHistoryAsync`, `GetHistoryAsync`.
- **Solution**: Record each edit; history entries immutable.

### Backend (Dev2)
#### Task 14 & 16: Finish Microservices
- Complete coding of `parser` and `filestorage` services, write Dockerfiles, test locally.
- Ensure `filestorage` returns correct URL (use `BASE_URL` env).
- Add API key authentication to sensitive endpoints.

#### Task 19: LLM & TTS Cache
- **LLM cache**:
  - Modify `llm_log` table: allow `user_id NULL` (remove `NOT NULL` constraint). Add unique index `(request_type, prompt) WHERE user_id IS NULL`.
  - Update `ILlmLogRepository.FindCachedAsync` to include `user_id IS NULL` in lookup.
  - Update service to prefer user-specific cache, fallback to global.
- **TTS cache**:
  - Modify `piper-gateway` (Python) to check file cache before calling Piper.
  - Cache key: `hashlib.sha256(text.encode()).hexdigest() + ".wav"` in `TTS_CACHE_DIR`.
  - If cache miss and `PIPER_ENABLED=false`, return 503.
  - Add env `TTS_CACHE_DIR`, `PIPER_ENABLED`.
- **Sync scripts**: Create Python script to pre-generate TTS from a text file, save to cache dir. Use `rsync` to push to VPS.

### Frontend (Dev1)
#### Task 5: Dashboard – Word of the Day
- **API**: `GET /api/dashboard/word-of-day` (implemented by backend Dev2? Actually backend Dev1 can do it, but we'll assume backend Dev2 handles it; frontend just consumes).
- **Store**: Add `dashboardStore` with `wordOfDay`, `loading`, `error`.
- **Component**: In `DashboardPage.vue`, create card with word, definition, example, speaker icon (if TTS available). Use skeleton loading.
- **Solution**: If no word, show fallback message.

#### Task 16: Avatar Frontend
- **Component**: `AvatarUpload.vue` using Ant Design `<a-upload>`. Shows current avatar (from `authStore.user.avatarUrl`), uploads to `POST /api/users/{userId}/avatar`.
- **Store**: Update user object after upload.
- **Integration**: Add to profile page.

#### Continue Task 17: Settings UI
- Create `SettingsDrawer.vue` with theme toggle (light/dark) and language selector (dropdown).
- Place settings button in `MobileLayout` header-right slot, opening drawer.
- Bind to store and apply theme changes (Ant Design `ConfigProvider` + Tailwind dark class).

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