# SLP Full Project – 7‑Day Development Schedule

This schedule assumes a single full‑stack developer working **~12 hours per day** (with focus and minimal interruptions). It prioritises core features first, then adds auxiliary components, ensuring every feature from the design documents is implemented by the end of Day 7. Infrastructure, microservices, and testing are integrated daily to avoid last‑minute surprises.

**Key principles**  
- Work iteratively: backend → frontend → integration.  
- Use Docker Compose for local development from Day 1.  
- Keep a running `TODO` list; adjust scope if time runs short (e.g., simplify LLM queue to synchronous mock initially).  
- All times are estimates; adjust based on your pace.

---

## Day 1 – Foundation & Authentication

**Goal**: Project structure, database, basic auth, session management, and frontend shell.

| Time | Task | Details |
|------|------|---------|
| 1h | Environment setup | Install .NET SDK, Node.js, Docker, Postgres, Redis. Create repo, initialise `docker-compose.yml` with Postgres, Redis, Kafka (if desired). |
| 2h | Backend skeleton | Create ASP.NET Core solution, project folders (Controllers, Models, Data, Services, Middleware). Add Entity Framework Core, configure DbContext. |
| 2h | Database schema | Write initial migration for `users`, `password_reset_tokens`, `email_verification_otps`. Run migration. |
| 3h | Authentication endpoints | Implement `POST /auth/login`, `POST /auth/logout`, `POST /auth/reset-password`, `POST /auth/reset-password/confirm`, `POST /auth/verify-email`, `GET /users/me`, `PUT /users/me`, `POST /users/me/verify-email/send`. Use Argon2id for password hashing. |
| 2h | Session & rate limiting | Set up Redis for session store and rate‑limiting counters. Implement `SessionMiddleware` and `RateLimitingMiddleware`. Add login rate limit (10/min). |
| 2h | Frontend shell | Create React/Vue app with routing, global layout (header, footer, user menu). Add login/register pages with basic forms. Connect to auth API. |

**End‑of‑Day Checklist**  
- [ ] Docker Compose runs Postgres, Redis.  
- [ ] Backend starts without errors.  
- [ ] Database has `users` table with seeded test user.  
- [ ] Login works (sets HTTP‑only cookie).  
- [ ] Frontend login/register pages functional.  
- [ ] Rate limiting returns 429 after 10 failed logins.  
- [ ] Session persists across browser restarts.

---

## Day 2 – Quizzes, Questions & Sources (Backend)

**Goal**: Complete backend CRUD for quizzes, questions (bank), sources; frontend list views and creation forms.

| Time | Task | Details |
|------|------|---------|
| 3h | Database models & migrations | Create tables: `source`, `question`, `quiz`, `quiz_source`, `quiz_note`, `quiz_question`, `tag`, `quiz_tag`, `question_tag`. Add indexes and foreign keys. Run migration. |
| 3h | Quiz & question endpoints | Implement `GET /quizzes`, `POST /quizzes`, `GET /quizzes/:id`, `PUT /quizzes/:id`, `DELETE /quizzes/:id` (soft delete admin only), `POST /quizzes/:id/duplicate`. Include tag handling. |
| 2h | Question bank endpoints | `GET /questions`, `POST /questions`, `GET /questions/:id`, `PUT /questions/:id`, `DELETE /questions/:id` (soft delete). Support filtering by type/tag/search. |
| 2h | Source endpoints | `POST /sources` (multipart/form‑data), `GET /sources/:id`, `DELETE /sources/:id` (soft delete). Integrate PDF/TXT extraction via a simple local service (or mock for now). |
| 2h | Frontend: quiz list & creation | Build quiz list page (tabs: My Quizzes / Public). Add “Create Quiz” form (basic info only, no questions yet). |
| 1h | Frontend: question bank list | Build question list with filters. Add “New Question” modal (basic fields). |

**End‑of‑Day Checklist**  
- [ ] All new tables created in DB.  
- [ ] Quiz CRUD works (create, read, update, duplicate).  
- [ ] Question bank CRUD works (create, edit, delete).  
- [ ] Source upload works (store file, return metadata).  
- [ ] Frontend can list quizzes and questions.  
- [ ] Frontend can create a quiz (without questions) and a question.

---

## Day 3 – Quiz Attempts & Player UI

**Goal**: Implement quiz attempt logic (snapshots, answers, submission) and the quiz player frontend.

| Time | Task | Details |
|------|------|---------|
| 2h | Database: attempt tables | Create `quiz_attempt`, `quiz_attempt_answer`. Run migration. |
| 3h | Backend attempt endpoints | `POST /quizzes/:id/attempts` (starts attempt, creates answer rows with snapshots), `GET /attempts/:id`, `POST /attempts/:id/answers`, `POST /attempts/:id/submit`, `GET /attempts/:id/review`. |
| 3h | Frontend: quiz player | Build player component: question display, answer input (based on type), navigation sidebar, auto‑save (debounced), submit modal. Integrate with attempt API. |
| 2h | Frontend: review page | Show attempt results: score, each question with user answer and correct answer, explanations. |
| 1h | Edge cases | Handle abandoned attempts (auto‑abandon after 24h – simulate by checking `start_time`). Add resume functionality. |
| 1h | Integration | Connect quiz detail page to “Start” button; after submit redirect to review. |

**End‑of‑Day Checklist**  
- [ ] Attempts can be started, answered, and submitted.  
- [ ] Snapshots store question data correctly.  
- [ ] Player works for all question types.  
- [ ] Review page displays correct info.  
- [ ] Auto‑abandon works (manually test by editing DB).  
- [ ] Frontend quiz detail shows attempt history.

---

## Day 4 – Reading System, Explanations, Favorites

**Goal**: Reading view with text selection actions, explanations table, favorites management.

| Time | Task | Details |
|------|------|---------|
| 2h | Database: explanation & progress | Create `explanation`, `user_source_progress` tables. Run migration. |
| 2h | Backend explanation endpoints | `GET /sources/:id/explanations`, `POST /explanations`, `PUT /explanations/:id`, `DELETE /explanations/:id`. |
| 1h | Backend progress endpoints | `GET /sources/:id/progress`, `PUT /sources/:id/progress`. |
| 2h | Frontend: reading view | Build source viewer (rich text rendering). Implement scroll position tracking (save to API debounced). Add “Resume” button. |
| 2h | Text selection bubble | Implement bubble menu on text selection. Actions: Explain (check existing, else queue LLM), Grammar (queue), TTS (queue), Add to Favorites. |
| 1h | Favorites endpoints | `GET /favorites`, `POST /favorites`, `PUT /favorites/:id`, `DELETE /favorites/:id`. |
| 1h | Frontend: favorites page | List, add, edit, delete favorites. Search/filter. |
| 1h | Integrate with bubble | When “Add to Favorites” tapped, open modal with text prefilled. |

**End‑of‑Day Checklist**  
- [ ] Reading view displays source content.  
- [ ] Progress saved and restored.  
- [ ] Text selection bubble appears with icons.  
- [ ] Explanations can be added/viewed (mock LLM).  
- [ ] Favorites CRUD works.  
- [ ] Grammar check and TTS actions trigger API calls (queued).

---

## Day 5 – LLM, Queues, Search & Tagging

**Goal**: Asynchronous LLM processing, global search, tag cloud, and polish.

| Time | Task | Details |
|------|------|---------|
| 2h | Kafka setup | Add Kafka to Docker Compose. Create topics `llm_requests`, `tts_requests`. |
| 2h | LLM queue service | Backend: implement `LLMQueueService` that publishes to Kafka. Add endpoints `POST /llm/explain`, `/llm/generate-questions`, `/llm/summarize`, `/llm/grammar-check`, `GET /llm/jobs/:id`. |
| 2h | LLM consumer microservice | Create Python service using `kafka-python` and `llama.cpp` (mock if not available). Consume jobs, call model, store result in `llm_log` and `explanation` (if explanation). |
| 1h | TTS consumer | Similar Python service using Piper (mock if not available). |
| 2h | Full‑text search | Add GIN indexes in PostgreSQL. Implement `GET /search` endpoint that searches quizzes, sources, questions, favorites. Return paginated mixed results. |
| 1h | Frontend: search UI | Build search page with tabs for each type. Highlight matches. |
| 1h | Tagging | Implement `GET /tags` (list with usage). Frontend tag cloud / autocomplete. |
| 1h | Integration | Connect LLM actions from reading bubble to new endpoints; show job status and poll for result. |

**End‑of‑Day Checklist**  
- [ ] Kafka running, topics created.  
- [ ] LLM and TTS consumer services start (mock responses if needed).  
- [ ] LLM requests are queued and processed (async).  
- [ ] Search returns correct results across all types.  
- [ ] Tags endpoint works; frontend displays tag list.  
- [ ] LLM actions in reading view show polling progress.

---

## Day 6 – Admin, Comments, Moderation & Remaining Features

**Goal**: Admin dashboard, commenting system, reports, and any missing features.

| Time | Task | Details |
|------|------|---------|
| 2h | Database: comment & report | Create `comment`, `report`, `admin_log` tables. Run migration. |
| 2h | Backend comment endpoints | `GET /comments` (with target param), `POST /comments`, `PUT /comments/:id`, `DELETE /comments/:id`, `POST /comments/:id/report`. |
| 1h | Backend report endpoints (admin) | `GET /reports`, `POST /reports/:id/resolve`. |
| 2h | Admin endpoints | `GET /admin/users`, `POST /admin/users/:id/ban`, `POST /admin/users/:id/unban`, `GET /admin/quizzes`, `POST /admin/quizzes/:id/disable`, `POST /admin/quizzes/:id/enable`, `GET /admin/comments`, `DELETE /admin/comments/:id`, `POST /admin/comments/:id/restore`. |
| 2h | Frontend: comments | Add comment section to quiz/source/question pages. Threaded display, reply, edit, delete, report. |
| 2h | Frontend: admin dashboard | Build admin layout with tabs: Users, Quizzes, Comments, Reports. Implement tables with actions (ban, disable, delete, resolve). |
| 1h | Admin logs | Display `admin_log` and `llm_log` in read‑only view. |
| 1h | Quiz mismatch detection | Add `mismatch` flag in `GET /quizzes/:id/edit` by comparing `updated_at` of bank question. Frontend shows warning icon. |

**End‑of‑Day Checklist**  
- [ ] Comments can be posted, replied, edited, deleted.  
- [ ] Reports can be submitted and viewed by admin.  
- [ ] Admin can ban/unban users, disable/enable quizzes, soft delete/restore comments.  
- [ ] Admin logs are recorded.  
- [ ] Quiz edit page shows mismatch warnings.  
- [ ] All remaining admin features functional.

---

## Day 7 – Testing, Bug Fixes, Deployment Prep

**Goal**: Ensure everything works, write E2E tests, prepare for production.

| Time | Task | Details |
|------|------|---------|
| 3h | Playwright E2E tests | Write critical path tests: login, create quiz, take quiz, add source, use reading bubble, admin actions. Run in CI locally. |
| 2h | Manual testing | Go through all features listed in the design doc, check edge cases (404, rate limits, file size limits, permissions). |
| 2h | Bug fixing | Fix any issues found. |
| 2h | Documentation | Update README with setup instructions, environment variables, deployment guide. |
| 2h | Deployment | Configure Nginx, set up SSL (self‑signed for now), build frontend, run containers in production mode. Test on local network. |
| 1h | Backup script | Create `backup.sh` that dumps DB and copies uploads, retain 30 days. |
| 1h | Final sanity check | Ensure all features from the design are present. Review the checklist below. |

**End‑of‑Day Checklist (Final Project Completion)**  
- [ ] All API endpoints from the design document are implemented and respond correctly.  
- [ ] Frontend covers all pages: login, register, quiz list, quiz detail, quiz player, review, question bank, source list, reading view, favorites, search, user profile, admin dashboard.  
- [ ] Authentication: login, logout, password reset, email verification.  
- [ ] Quiz: create, edit, duplicate, delete (admin), filters, tags.  
- [ ] Question bank: CRUD, filter, search, add to quiz.  
- [ ] Sources: upload (PDF/TXT/URL), reading view with progress, text selection bubble actions (explain, grammar, TTS, favorites).  
- [ ] Explanations: system/user, editable.  
- [ ] Favorites: CRUD, search.  
- [ ] Comments: threaded, edit, delete, report.  
- [ ] Admin: users (ban/unban), quizzes (disable/enable), comments (soft delete/restore), reports (resolve), logs.  
- [ ] Search: global search with type tabs.  
- [ ] Tags: list with counts.  
- [ ] LLM: async processing via Kafka, job polling.  
- [ ] TTS: async processing (mock).  
- [ ] Rate limiting: login (10/min), comments (20/min), attempts (30/hr), LLM (10/hr).  
- [ ] File upload limits: PDF ≤20 MB, TXT ≤5 MB.  
- [ ] Security: password hashing (Argon2id), HTML sanitisation, HTTP‑only cookies.  
- [ ] Infrastructure: Docker Compose orchestrates all services, Redis for sessions, Kafka for queues, Nginx reverse proxy.  
- [ ] E2E tests pass for critical journeys.  
- [ ] Backup script works.

---