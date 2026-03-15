# SLP Full Project – 7‑Day Development Schedule

This schedule assumes a single full‑stack developer working **~12 hours per day** (with focus and minimal interruptions). It prioritises core features first, then adds auxiliary components, ensuring every feature from the design documents is implemented by the end of Day 7. Infrastructure, microservices, and testing are integrated daily to avoid last‑minute surprises.

**Key principles**  
- Work iteratively: backend → frontend → integration.  
- Use Docker Compose for local development from Day 1.  
- Keep a running `TODO` list; adjust scope if time runs short (e.g., simplify LLM queue to synchronous mock initially).  
- All times are estimates; adjust based on your pace.

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