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