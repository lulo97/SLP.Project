# SLP Platform – Project Document

## 1. Overview

The Self Learning Platform (SLP) is a personal learning web application that helps individuals study language and general knowledge through quizzes, flashcards, reading sources, notes, and AI assistance (local LLM). The system consists of:

- **Backend**: .NET 10 Web API (REST + some RPC) with PostgreSQL, Redis, and integrations with external services (LLM, TTS, email, file storage, parser).
- **Frontend**: Vue 3 + TypeScript + Pinia + Ant Design Vue, served as static files.
- **Database**: PostgreSQL 17 with tables for users, sessions, quizzes, questions, sources, comments, reports, etc.
- **Supporting Services**: 
  - LLM (llama.cpp) for explanations, question generation, grammar checking.
  - TTS (Piper + FastAPI gateway) for text-to-speech.
  - Parser microservice for PDF/text extraction.
  - File storage microservice for uploaded files.
  - Email microservice for sending emails.
- **Infrastructure**: Docker Compose orchestrates all services.

The document below details every file with content, explaining its purpose and key elements. Files without content are skipped as requested.

---

## 2. Backend (.NET)

### 2.1 Project Configuration & Entry

**File: `slp/backend-dotnet/backend-dotnet.csproj`**  
- Target framework: net10.0  
- Dependencies: Entity Framework Core, Npgsql, Redis, Serilog, Swashbuckle, Argon2 (Konscious.Security.Cryptography).

**File: `slp/backend-dotnet/backend-dotnet.csproj.user`**  
- Sets the active debug profile to "https".

**File: `slp/backend-dotnet/backend-dotnet.http`**  
- Example HTTP request file for testing.

**File: `slp/backend-dotnet/backend-dotnet.slnx`**  
- Solution file referencing the project.

**File: `slp/backend-dotnet/appsettings.json`**  
- Contains all configuration:  
  - Connection strings (PostgreSQL, Redis)  
  - Email settings (endpoint, from address)  
  - LLM API URL (`http://localhost:3003/v1/chat/completions`)  
  - Queue settings (enabled, max retries)  
  - Parser service, File storage, TTS API URLs  
  - Frontend base URL

**File: `slp/backend-dotnet/appsettings.Development.json`**  
- Overrides logging level for development.

**File: `slp/backend-dotnet/Program.cs`**  
- Sets up Serilog logging.  
- Adds services: Controllers, Persistence, Application Services, Caching, Auth & CORS, File Storage.  
- Adds Swagger (always enabled).  
- Runs health checks at startup:  
  - Database connection (fatal)  
  - LLM server health (non-fatal)  
  - TTS gateway health (non-fatal)  
- Middleware pipeline: CORS, HTTPS redirection, Authentication, RateLimiting, SessionMiddleware, Authorization, MapControllers.

**File: `slp/backend-dotnet/Dockerfile`**  
- Multi-stage build:  
  1. Build stage: copies .csproj, restores, builds/publishes.  
  2. Runtime stage: copies published output, sets environment variables, exposes port 3001.

### 2.2 Data Layer

**File: `slp/backend-dotnet/Data/AppDbContext.cs`**  
- EF Core DbContext with all tables:  
  - Users, Sessions  
  - Quizzes, QuizQuestions, QuizTags, QuizSources  
  - Questions, QuestionTags  
  - Sources, Tags, Notes, QuizNotes  
  - QuizAttempts, QuizAttemptAnswers  
  - Explanations, UserSourceProgress, FavoriteItem  
  - LlmLog, Comment, CommentHistory, Report, AdminLog, DailyWord  
- Configures relationships, indexes, soft-delete filters (e.g., `HasQueryFilter(q => !q.Disabled)` for quizzes, `deleted_at` for sources and comments).  
- Defines composite keys for many-to-many tables.

### 2.3 Extensions (Startup Helpers)

**File: `slp/backend-dotnet/Extensions/ServiceCollectionExtensions.cs`**  
- **AddPersistence**: Registers DbContext and all repositories.  
- **AddApplicationServices**: Registers services (Auth, User, Quiz, Question, Source, Comment, Report, Admin, Dashboard, WordOfTheDay, Note).  
- **AddCaching**:  
  - Registers Redis connection factory.  
  - Conditionally registers `IQueueService` (RedisQueueService or NullQueueService) and `BackgroundJobProcessor` if queue enabled.  
  - Adds Redis distributed cache.  
- **AddAuthAndCors**: Adds authentication scheme "Session" with `DummyAuthHandler`, and CORS policy "Frontend".  
- **AddFileStorage**: Configures `FileStorageSettings` from configuration and registers `IFileStorageClient` with HttpClient.

**File: `slp/backend-dotnet/Extensions/WebApplicationExtensions.cs`**  
- **CheckDatabaseConnectionAsync**: Tests PostgreSQL connection, logs success/warning.  
- **CheckLlmConnectionAsync**: Probes llama.cpp `/health` endpoint; non-fatal.  
- **CheckTtsConnectionAsync**: Probes piper-gateway `/health` endpoint; non-fatal.

### 2.4 Middleware

**File: `slp/backend-dotnet/Middlewares/RateLimitingMiddleware.cs`**  
- Applies rate limiting only to login endpoint (POST `/api/auth/login`).  
- Uses distributed cache (Redis) to track attempts per IP (10 attempts per minute).  
- Skips rate limit for localhost. Returns 429 if exceeded.

**File: `slp/backend-dotnet/Middlewares/SessionMiddleware.cs`**  
- Reads `X-Session-Token` header.  
- Hashes token, looks up session in DB.  
- If valid (not revoked, not expired), populates `HttpContext.User` with claims (UserId, session_id, role).  
- No cookie; uses header token (client stores in localStorage).

### 2.5 Helpers

**File: `slp/backend-dotnet/Helpers/AdminHelper.cs`**  
- Static method `IsAdmin(int userId)` – hardcoded admin ID = 1 (simplified).

**File: `slp/backend-dotnet/Helpers/PaginatedResult.cs`**  
- Generic class for paginated responses: Items, Total, Page, PageSize, TotalPages.

**File: `slp/backend-dotnet/Helpers/QuestionValidationHelper.cs`**  
- Validates question snapshots against strict JSON schemas for each question type.  
- Checks required fields (type, content, metadata) and type-specific structures (options, correctAnswers, items, pairs, etc.).  
- Throws `ArgumentException` with descriptive messages on failure.

### 2.6 Features (Controllers, Services, Repositories, DTOs)

#### 2.6.1 Admin
- **Files**: `AdminController.cs`, `AdminService.cs`, `AdminLog.cs`, `AdminLogRepository.cs`, `AdminDTOs.cs`  
- Handles admin-only actions: ban/unban users, disable/enable quizzes, moderate comments, view logs.

#### 2.6.2 Auth
- **Files**: `AuthController.cs`, `AuthService.cs`, `AuthDTO.cs`, `DummyAuthHandler.cs`, `PasswordHasher.cs`  
- Implements login (username + password), registration, logout, password reset (token-based), email verification (OTP).  
- Uses Argon2id password hashing.  
- `DummyAuthHandler` is a placeholder that validates the session from middleware (doesn't do actual auth; session middleware already set principal).

#### 2.6.3 Comment
- **Files**: `Comment.cs`, `CommentController.cs`, `CommentDTOs.cs`, `CommentRepository.cs`, `CommentService.cs`  
- Comments on quizzes, sources, questions.  
- Supports nesting (replies), soft delete, edit history (CommentHistory table).  
- Rate limiting per user/IP.

#### 2.6.4 Email
- **Files**: `EmailService.cs`, `IEmailService.cs`  
- Sends emails via HTTP to a separate email microservice.

#### 2.6.5 Explanation
- **Files**: `Explanation.cs`, `ExplanationController.cs`, `ExplanationDTO.cs`, `ExplanationRepository.cs`, `ExplanationService.cs`  
- User or system-generated explanations for selected text ranges within a source.  
- `author_type` distinguishes system (LLM) from user; user explanations can be edited.

#### 2.6.6 Favourite
- **Files**: `FavouriteController.cs`, `FavouriteDTO.cs`, `FavouriteItem.cs`, `FavouriteRepository.cs`, `FavouriteService.cs`  
- Personal vocabulary notebook: stores text, type (word/phrase/idiom/other), optional note.

#### 2.6.7 Llm (AI)
- **Files**: `LlmController.cs`, `LlmService.cs`, `LlmLog.cs`, `LlmLogRepository.cs`, `LlmJob.cs`, `QueueService.cs`  
- Queues LLM requests (explain, generate questions, summarize, grammar check).  
- `RedisQueueService` stores jobs in Redis; `BackgroundJobProcessor` processes them asynchronously.  
- Logs all requests/responses to `llm_log` table.

#### 2.6.8 Note
- **Files**: `Note.cs`, `NoteDTO.cs` (plus repository/interface in other files)  
- Simple notes that can be attached to quizzes.

#### 2.6.9 Progress
- **Files**: `ProgressService.cs`, `ProgressDTO.cs`, `ProgressRepository.cs`, `UserSourceProgress.cs`  
- Tracks reading progress per source per user (last position, updated timestamp).

#### 2.6.10 Question
- **Files**: `Question.cs`, `QuestionController.cs`, `QuestionDTO.cs`, `QuestionRepository.cs`, `QuestionService.cs`, `QuestionTag.cs`  
- CRUD for bank questions.  
- Supports various types with JSON metadata.

#### 2.6.11 Quiz
- **Files**: `Quiz.cs`, `QuizController.cs`, `QuizDTO.cs`, `QuizRepository.cs`, `QuizService.cs`, `QuizNote.cs`, `QuizQuestion.cs`, `QuizSource.cs`, `QuizTag.cs`  
- CRUD for quizzes, including adding/removing questions (cloned snapshots), tags, sources.  
- Duplicate quiz, visibility (public/private), soft delete (disabled flag).

#### 2.6.12 QuizAttempt
- **Files**: `AttemptController.cs`, `AttemptService.cs`, `AttemptRepository.cs`, `QuizAttempt.cs`, `QuizAttemptAnswer.cs`, `AttemptDTO.cs`  
- Manages quiz attempts: start, submit answers, finish, review.  
- Stores question snapshots and user answers as JSON.

#### 2.6.13 Report
- **Files**: `Report.cs`, `ReportController.cs`, `ReportDTOs.cs`, `ReportRepository.cs`, `ReportService.cs`  
- Users can report quizzes, questions, comments.  
- Admins resolve reports, actions logged.

#### 2.6.14 Search
- **Files**: `SearchController.cs`, `SearchService.cs`, `SearchDtos.cs`, `TagController.cs`  
- Full-text search across quizzes, questions, sources, favorites using PostgreSQL `to_tsvector`.  
- Paginated results.

#### 2.6.15 Session
- **Files**: `Session.cs`, `SessionRepository.cs`, `SessionTokenService.cs`  
- Manages user sessions (tokens stored in Redis, but fallback to DB? Code shows DB only).  
- Token hashing with SHA256.

#### 2.6.16 Source
- **Files**: `Source.cs`, `SourceController.cs`, `SourceDTO.cs`, `SourceRepository.cs`, `SourceService.cs`  
- Upload files (PDF, TXT) or add from URL/text.  
- Extracted text stored in `raw_text` and structured content (TipTap JSON) in `content`.  
- Soft delete (deleted_at).  
- Handles reading progress and explanations.

#### 2.6.17 Tag
- **Files**: `Tag.cs`, `TagRepository.cs`  
- Global tags, unique by name, many-to-many with quizzes and questions.

#### 2.6.18 User
- **Files**: `User.cs`, `UserRepository.cs`, `UserService.cs`  
- Basic user management: create, update, fetch by id/username/email.

---

## 3. Frontend (Vue)

### 3.1 Project Configuration

**File: `slp/frontend-vue/.env`**  
- Defines environment variables for backend API, frontend port, TTS URL, file storage URL.

**File: `slp/frontend-vue/Dockerfile`**  
- Multi-stage:  
  1. Build: install dependencies, run `npm run build`.  
  2. Runtime: serves `dist` via `http-server` on port 3002.

**File: `slp/frontend-vue/index.html`**  
- HTML entry point, loads Tailwind CSS and Inter font.

**File: `slp/frontend-vue/package.json`**  
- Dependencies: Vue 3, Pinia, Vue Router, Ant Design Vue, Axios, Chart.js, Lucide icons, etc.  
- Dev scripts: dev, build, preview.

**File: `slp/frontend-vue/tsconfig.json`**  
- References tsconfig.app.json and tsconfig.node.json.

**File: `slp/frontend-vue/tsconfig.app.json`**  
- TypeScript configuration for the app: strict mode, path aliases (`@/*` → `src/*`), includes src.

**File: `slp/frontend-vue/tsconfig.node.json`**  
- TypeScript for vite.config.ts.

**File: `slp/frontend-vue/vite.config.ts`**  
- Vite config: Vue plugin, alias @ to src, server host `0.0.0.0`, port from env.

### 3.2 Core Files

**File: `slp/frontend-vue/src/main.ts`**  
- Creates Vue app, uses Pinia, Ant Design, router, i18n.  
- Syncs i18n locale with settings store.

**File: `slp/frontend-vue/src/App.vue`**  
- Wraps `router-view` in Ant Design ConfigProvider with blue primary color.  
- On mount, if session token exists, fetches current user.

**File: `slp/frontend-vue/src/router/index.ts`**  
- Defines routes for all pages: login, register, dashboard, profile, admin, quiz CRUD, question bank, source management, quiz attempt player, search, reports, etc.  
- Route guards: requiresAuth, requiresGuest, requiresAdmin.

### 3.3 API Client

**File: `slp/frontend-vue/src/lib/api/client.ts`**  
- Axios instance with baseURL from env.  
- Request interceptor adds `X-Session-Token` header from localStorage.  
- Response interceptor: on 401, if not a public endpoint, clears storage and redirects to login.

### 3.4 Internationalization

**File: `slp/frontend-vue/src/i18n.ts`**  
- Creates Vue I18n instance with fallback locale 'en'.  
- Reads initial locale from localStorage (`app_settings`).  
- Exports i18n to be used in main.ts.

**File: `slp/frontend-vue/src/locales/en.json`**  
- English translations for common UI text (common, nav, auth, quiz, question, source, settings).

**File: `slp/frontend-vue/src/locales/vi.json`**  
- Vietnamese translations (mirror keys of en.json).

### 3.5 Layouts

**File: `slp/frontend-vue/src/layouts/MobileLayout.vue`**  
- Top header with breadcrumb (left slot), optional centre/right slots, hamburger menu toggle.  
- Main content area.  
- RightSidebar component for menu navigation.

**File: `slp/frontend-vue/src/layouts/RightSidebar.vue`**  
- Sidebar with user info, navigation menu, logout, settings modal.  
- Uses Ant Design Menu.  
- Settings modal allows theme (light/dark) and language (en/vi) selection.

### 3.6 Components

**File: `slp/frontend-vue/src/components/Breadcrumb.vue`**  
- Dynamic breadcrumb based on route name.  
- Fetches dynamic titles from stores (quizStore, sourceStore).  
- Collapses items when exceeding maxItems.

**File: `slp/frontend-vue/src/components/TagSelector.vue`**  
- Ant Design Select with `mode="tags"`.  
- Fetches existing tags from tagStore.  
- Limits to 10 tags, de-duplicates, trims.

### 3.7 Features (Pages, Stores, Composables)

#### 3.7.1 Admin
- **Page**: `AdminPage.vue` – admin dashboard with tabs for users, quizzes, comments, reports.  
- **Stores**: `adminStore.ts`, `userStore.ts` – manage admin data and user list.  
- **Types**: `admin.types.ts`.

#### 3.7.2 Auth
- **Pages**: `LoginPage.vue`, `RegisterPage.vue`.  
- **Store**: `authStore.ts` – manages login, registration, logout, fetching current user, checking admin role.

#### 3.7.3 Comment
- **Components**: `CommentItem.vue`, `CommentsSection.vue`.  
- **Store**: `commentStore.ts`.

#### 3.7.4 Dashboard
- **Page**: `DashboardPage.vue` – shows recent quizzes, sources, word of the day.

#### 3.7.5 LLM
- **File**: `llmService.ts` – functions to call backend LLM endpoints.

#### 3.7.6 Profile
- **Page**: `ProfilePage.vue` – view/edit profile, verify email.

#### 3.7.7 Question
- **Components**: `FillBlank.vue`, `MultipleChoice.vue`, `Ordering.vue`, `Matching.vue`, `TrueFalse.vue`, `Flashcard.vue`, `QuestionForm.vue`.  
- **Pages**: `QuestionFormPage.vue`, `QuestionListPage.vue`.  
- **Store**: `questionStore.ts`.

#### 3.7.8 Quiz
- **Components**: `NotesSection.vue`, `QuestionFormModal.vue`, `QuestionsSection.vue`, `QuizActionsCard.vue`, `QuizInfoCard.vue`, `SourcesSection.vue`.  
- **Composables**: `useQuizQuestions.ts` – manages adding/removing/reordering questions.  
- **Pages**: `QuizListPage.vue`, `QuizFormPage.vue`, `QuizDetailPage.vue`, `QuizViewPage.vue` (public view).  
- **Store**: `quizStore.ts`.  
- **Types**: `index.ts` – defines `Quiz`, `QuizQuestion`, etc.  
- **Utils**: `questionHelpers.ts` – helper for question snapshot validation.

#### 3.7.9 Quiz Attempt
- **Components**: `AutoSaveIndicator.vue`, `FillBlankQuestion.vue`, `FlashcardQuestion.vue`, `MatchingQuestion.vue`, `MultipleChoiceQuestion.vue`, `OrderingQuestion.vue`, `QuestionDisplay.vue`, `SingleChoiceQuestion.vue`, `TrueFalseQuestion.vue`.  
- **Composables**: `useAttempt.ts` – manages attempt state, answer submission, auto-save.  
- **Pages**: `QuizPlayer.vue`, `AttemptReview.vue`.  
- **Store**: `attemptStore.ts`.

#### 3.7.10 Report
- **Components**: `ReportModal.vue` – form to report content.  
- **Pages**: `UserReportsPage.vue`, `AdminReports.vue`.

#### 3.7.11 Search
- **Page**: `SearchPage.vue`.  
- **Store**: `searchStore.ts`.

#### 3.7.12 Source
- **Components**: `ExplanationPanel.vue`, `SelectionBubble.vue`.  
- **Pages**: `SourceListPage.vue`, `SourceDetailPage.vue` (reading view), `SourceUploadPage.vue`, `SourceUrlCreatePage.vue`, `SourceNoteCreatePage.vue`.  
- **Store**: `sourceStore.ts`.

#### 3.7.13 TTS
- **Component**: `TtsPlayer.vue` – plays audio from TTS service.  
- **Composable**: `useTts.ts` – calls TTS endpoint and plays audio.

### 3.8 Additional Files

**File: `slp/frontend-vue/README.md`** – boilerplate Vue 3 + TypeScript readme.

**File: `slp/frontend-vue/.vscode/extensions.json`** – recommends Vue.volar extension.

---

## 4. Database Tables (PostgreSQL)

All SQL files are in `database/tables/`. They create tables with constraints, indexes, and foreign keys.

| File | Table | Purpose |
|------|-------|---------|
| `admin_log.sql` | admin_log | Admin actions log (admin_id, action, target, details). |
| `comment.sql` | comment | Comments on quiz/source/question, supports nesting, soft delete. |
| `comment_history.sql` | comment_history | Edits history of comments. |
| `daily_word.sql` | daily_word | Word of the day (for dashboard). |
| `explanation.sql` | explanation | Text explanations for selected ranges in sources. |
| `favorite_item.sql` | favorite_item | Personal vocabulary notebook. |
| `llm_log.sql` | llm_log | Logs of LLM requests/responses. |
| `metrics.sql` | metrics | (Optional) metrics for monitoring. |
| `note.sql` | note | User notes (can be attached to quizzes). |
| `question.sql` | question | Question bank. |
| `question_tag.sql` | question_tag | Many-to-many between questions and tags. |
| `quiz.sql` | quiz | Quiz metadata (title, description, visibility, disabled). |
| `quiz_attempt.sql` | quiz_attempt | Quiz attempts (user, quiz, score, status). |
| `quiz_attempt_answer.sql` | quiz_attempt_answer | Answers per question in an attempt (snapshot). |
| `quiz_note.sql` | quiz_note | Many-to-many between quizzes and notes. |
| `quiz_question.sql` | quiz_question | Cloned questions in a quiz (snapshot, display order). |
| `quiz_source.sql` | quiz_source | Many-to-many between quizzes and sources. |
| `quiz_tag.sql` | quiz_tag | Many-to-many between quizzes and tags. |
| `quiz_view.sql` | quiz_view | View tracking (1 per IP per hour). |
| `report.sql` | report | User reports on quizzes, questions, comments. |
| `sessions.sql` | sessions | Session tokens (token_hash, expires, revoked). |
| `source.sql` | source | Sources (books, links, notes, PDFs, TXTs) with rich text. |
| `tag.sql` | tag | Global tags (unique name). |
| `users.sql` | users | User accounts (username, password hash, email, role, status). |
| `user_source_progress.sql` | user_source_progress | Reading progress per source per user. |

---

## 5. Infrastructure

### 5.1 Docker Compose

**File: `slp/infranstructure/docker-compose.yml`**  
- Defines services:  
  - **postgres**: PostgreSQL 17, port 5433, health check.  
  - **redis**: Redis 7, port 6379.  
  - **mail**: Build from `./mail` (email service).  
  - **backend-dotnet-img**: Build from `../backend-dotnet`, depends on postgres, redis, mail.  
  - **frontend-vue-img**: Build from `../frontend-vue`, depends on backend.  
  - **llama**: Uses `ghcr.io/ggml-org/llama.cpp:server`, mounts model volume, command line for model, context size, port.  
  - **piper**: Uses `wyoming/piper` image (or custom), command with voice, volumes.  
  - **piper-gateway**: Build from `./piper-gateway`, runs FastAPI server, depends on piper.  
  - **parser**: Build from `./parser` (text extraction).  
  - **filestorage**: Build from `./filestorage`, mounts volume for files.  
- Volumes for postgres_data, redis_data, filestorage_data.

### 5.2 Piper Gateway (TTS)

**File: `slp/infranstructure/piper-gateway/server.py`**  
- FastAPI gateway to Piper TTS container.  
- **Endpoints**:  
  - `GET /health` – returns status and piper_enabled flag.  
  - `GET /tts?text=...` – returns WAV audio (cached).  
  - `POST /tts` – same with JSON body.  
- Caching: SHA256 of text as filename, stored in TTS_CACHE_DIR.  
- If Piper offline but cache exists, returns cached; else returns 503.  
- Uses `wyoming` library to communicate with Piper over TCP.

### 5.3 Environment Variables

**File: `slp/infranstructure/.env`**  
- Defines ports and paths for all services:  
  - POSTGRESQL_PORT, BACKEND_DOTNET_PORT, VITE_FRONTEND_PORT, LLAMA_PORT, PIPER_PORT, GATEWAY_PORT, etc.  
  - LLAMA_MODEL_VOLUME_PATH, LLAMA_MODEL_NAME.  
  - PIPER_IMAGE, PIPER_VOICE, PIPER_DATA.  
  - GATEWAY_IMAGE, GATEWAY_APP_PATH.  
  - VITE_API_BACKEND_URL, VITE_TTS_URL, VITE_FILESTORAGE_URL.  
  - FILESTORAGE_API_KEY.

---

## 6. Overview Document

**File: `documents/overview.md`**  
- Comprehensive design document covering:  
  - Purpose, user accounts, authentication.  
  - Quiz system, question bank, flashcards, reading system.  
  - LLM integration (queue, logging).  
  - Favorites, tagging, search, moderation.  
  - Architecture, storage, security.  
  - Data model, API examples, UI/UX notes.  
  - Additional clarifications: email optional, soft delete, rate limiting, sanitization, admin dashboard, concurrency.

---

## 7. E2E Tests (Playwright)

The `e2e_tests` folder contains many test files (`.spec.js`). Since the content of those files was not provided in the input, they are skipped per the instruction. The presence of the folder and file list is noted, but no details are included.

---

## 8. Utility Scripts

**File: `docker-compose-up.bat`** – Batch file to run docker-compose up.

**File: `git-diff.bat`** – Probably a script to show git diff.

**File: `view_project_surface.js`** – Node script to walk the project and generate a `project-structure.txt` containing concatenated file contents (excluding large files, binary, node_modules). This is likely the script that produced the input.

---

## Appendix: Key Features Summary

- **Authentication**: Session-based via token header, no cookies. Admin role hardcoded (ID=1).  
- **Quiz Creation**: Users can create quizzes from bank questions, adding tags and sources.  
- **Question Types**: multiple_choice, single_choice, true_false, fill_blank, ordering, matching, flashcard.  
- **Attempts**: Snapshots of questions at start time; answers stored as JSON; resume within 24h.  
- **Reading**: Sources with rich text; selection bubble offers explain, grammar, TTS, favorite.  
- **LLM**: Queued, logs stored; supports explanation, question generation, summarization, grammar check.  
- **TTS**: Cached WAV via piper-gateway; English only.  
- **Search**: PostgreSQL full-text across quizzes, questions, sources, favorites.  
- **Moderation**: Admins can ban users, disable quizzes, delete comments; reports logged.  
- **Frontend**: Mobile-first, responsive; uses Pinia for state; i18n for English/Vietnamese.

---

This document covers all files with content from the provided input. It serves as a comprehensive reference for developers, business analysts, and testers to understand the project structure and functionality.