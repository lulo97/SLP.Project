# SLP Full Project – 7‑Day Development Schedule

This schedule assumes a single full‑stack developer working **~12 hours per day** (with focus and minimal interruptions). It prioritises core features first, then adds auxiliary components, ensuring every feature from the design documents is implemented by the end of Day 7. Infrastructure, microservices, and testing are integrated daily to avoid last‑minute surprises.

**Key principles**  
- Work iteratively: backend → frontend → integration.  
- Use Docker Compose for local development from Day 1.  
- Keep a running `TODO` list; adjust scope if time runs short (e.g., simplify LLM queue to synchronous mock initially).  
- All times are estimates; adjust based on your pace.

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
- [ ] LLM: async processing via Redis, job polling.  
- [ ] TTS: async processing (mock).  
- [ ] Rate limiting: login (10/min), comments (20/min), attempts (30/hr), LLM (10/hr).  
- [ ] File upload limits: PDF ≤20 MB, TXT ≤5 MB.  
- [ ] Security: password hashing (Argon2id), HTML sanitisation, HTTP‑only cookies.  
- [ ] Infrastructure: Docker Compose orchestrates all services, Redis for sessions, Redis for queues, Nginx reverse proxy.  
- [ ] E2E tests pass for critical journeys.  
- [ ] Backup script works.

---