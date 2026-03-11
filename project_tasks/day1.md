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