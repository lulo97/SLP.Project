
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


#### Task 19: LLM & TTS Cache
- **LLM cache**:
  - Modify `llm_log` table: allow `user_id NULL` (remove `NOT NULL` constraint). Add unique index `(request_type, prompt) WHERE user_id IS NULL`.
  - Update `ILlmLogRepository.FindCachedAsync` to include `user_id IS NULL` in lookup.
  - Update service to prefer user-specific cache, fallback to global.
  - Also check llama.cpp service call to check health from backend dotnet
- **TTS cache**:
  - Modify `piper-gateway` (Python) to check file cache before calling Piper.
  - Cache key: `hashlib.sha256(text.encode()).hexdigest() + ".wav"` in `TTS_CACHE_DIR`.
  - If cache miss and `PIPER_ENABLED=false`, return 503.
  - Add env `TTS_CACHE_DIR`, `PIPER_ENABLED`.
  - Also check service call to check health from backend dotnet

#### Task 5: Dashboard – Word of the Day
- **API**: `GET /api/dashboard/word-of-day`
  + Show a word with vietnamese definition + detail dictionary metadata
  + Origin of word
  + Examples of word
  + Fun fact about word
- **Store**: Add `dashboardStore` with `wordOfDay`, `loading`, `error`.
- **Component**: In `DashboardPage.vue` (design later)
- **Solution**: If no word, show fallback message.

#### Task 10: Quiz Edit – Notes & Sources
- **NotesSection**: Add edit button (pencil) emitting `edit` event. Parent (`QuizFormPage`) opens note modal in edit mode, calls `PUT /api/notes/{id}`.
- **SourcesSection**: Add view button (eye) emitting `view` event. Parent navigates to source detail
- **Store**: Add `updateNote` action in `quizStore` (or note store).

#### Task 11: Empty Quiz Attempt Prevention
- In `QuizDetailPage` and `QuizViewPage`, bind `:disabled="questions.length === 0"` to start attempt button. Add tooltip explaining why.
- backend will also validate.

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


#### Task 2: Admin Reports – Resolved View & Undo
- **AdminReports.vue**: Add tabs for “Unresolved” (default) and “Resolved”.
- **Resolved tab**: Fetch from `GET /api/reports?resolved=true`. Display table with columns: ID, Reporter, Target, Reason, Resolved By, Resolved At, Undo button.
- **Undo**: Call `POST /api/reports/{id}/undo-resolve`, then refresh both tabs.
- **Actions**: For unresolved, add “Resolve” button (calls resolve endpoint) and direct moderation buttons (Delete Comment, Disable Quiz) – these will call existing admin endpoints.
- **Solution**: Undo allowed for any admin, logged in `admin_log`.

#### Task 18: Health Dashboard Backend
- **Controller**: `HealthDashboardController` with `[Authorize(Roles = "admin")]` and endpoint `GET /api/health/services`.
- **Implementation**: Parallel checks using `IHttpClientFactory` (HTTP) and `TcpClient` (TCP). Timeout 3 seconds.
- **Services to check**: Redis (port 6379), Mail (SMTP port), Backend (self, optional), Frontend (HTTP root), Llama (HTTP `/health`), Piper (TCP port), Piper Gateway (HTTP `/health`), ...
- **Response**: JSON with timestamp and array of `{ name, status, details, responseTimeMs }`.
- **Cache**: In-memory cache for 10 seconds to reduce load.
- **Frontend**: Add a page to view services status