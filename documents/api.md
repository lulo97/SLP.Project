# SLP API Design (v1)

Base URL: `/api/v1`  
Authentication: Cookie‑based session (HTTP‑only, secure). All endpoints except explicitly noted require an active session.  
Response Format: JSON (`application/json`)  
Pagination: For list endpoints, use `page` and `limit` query parameters (default `page=1`, `limit=20`). Response includes `data` array, `total`, `page`, `limit`.  
Error Responses: Standard HTTP status codes with a JSON body: `{ "error": { "code": "ERROR_CODE", "message": "Human readable message" } }`

---

## Authentication & Users

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| POST   | `/auth/login`                 | Login with username + password. Sets session cookie. |
| POST   | `/auth/logout`                | Logout – destroys session. |
| POST   | `/auth/reset-password`        | Request password reset token. Body: `{ "email": "..." }` |
| POST   | `/auth/reset-password/confirm`| Confirm reset with token. Body: `{ "token": "...", "new_password": "..." }` |
| POST   | `/auth/verify-email`          | Submit email verification OTP. Body: `{ "otp": "123456" }` |
| GET    | `/users/me`                   | Get current user profile. |
| PUT    | `/users/me`                   | Update profile (e.g., email). Body: `{ "email": "..." }` |
| POST   | `/users/me/verify-email/send` | Request a new email verification OTP (rate limited). |

---

## Quizzes

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| GET    | `/quizzes`                    | List quizzes. Supports query filters: `visibility` (public/private), `tags` (comma separated), `search` (text). |
| POST   | `/quizzes`                    | Create a new quiz. Body: `{ "title": "...", "description": "...", "visibility": "public" }` |
| GET    | `/quizzes/:id`                | Get public quiz data (for taking). Includes questions (cloned snapshot). |
| PUT    | `/quizzes/:id`                | Update quiz metadata and questions. Body includes full quiz definition (see below). |
| DELETE | `/quizzes/:id`                | Soft delete (admin only). |
| POST   | `/quizzes/:id/duplicate`      | Create a copy of the quiz owned by the current user. |
| GET    | `/quizzes/:id/edit`           | Get detailed quiz for editing, includes mismatch info per question (`mismatch: true` if bank question updated). |

**Quiz Update Payload (PUT):**
```json
{
  "title": "Updated Title",
  "description": "...",
  "visibility": "private",
  "questions": [
    {
      "original_question_id": 42,      // null if new custom question
      "type": "multiple_choice",
      "content": "What is 2+2?",
      "explanation": "...",
      "metadata": {                     // type-specific
        "options": [{"id": "a", "text": "3"}, ...],
        "correct": ["b"]
      },
      "display_order": 1
    }
  ],
  "source_ids": [1,2,3],
  "note_ids": [4,5],
  "tag_names": ["math", "addition"]
}
```

---

## Quiz Attempts

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| POST   | `/quizzes/:id/attempts`       | Start a new attempt. Returns `attempt_id`. |
| GET    | `/attempts/:id`               | Get current attempt state (questions, answers so far). |
| POST   | `/attempts/:id/answers`       | Submit an answer for a question. Body: `{ "question_id": 123, "answer_json": {...} }` |
| POST   | `/attempts/:id/submit`        | Finish the attempt (manual submission). Calculates score. |
| GET    | `/attempts/:id/review`        | Get completed attempt details (snapshots, correct/incorrect). |

---

## Question Bank

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| GET    | `/questions`                  | List bank questions. Supports `type`, `tag`, `search` filters. |
| POST   | `/questions`                  | Create a new bank question. Body similar to question object (without `original_question_id`). |
| GET    | `/questions/:id`              | Get bank question. |
| PUT    | `/questions/:id`              | Update bank question. |
| DELETE | `/questions/:id`              | Soft delete (hides from bank, but existing quiz clones remain). |

---

## Sources

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| POST   | `/sources`                    | Upload a file (PDF/TXT) or submit text/URL. Multipart/form-data or JSON. Returns source object. |
| GET    | `/sources/:id`                | Get source metadata and content (rich text, raw_text, etc.). |
| DELETE | `/sources/:id`                | Soft delete (hides from UI, remains attached to quizzes). |
| GET    | `/sources/:id/progress`       | Get reading progress for current user. |
| PUT    | `/sources/:id/progress`       | Update reading progress. Body: `{ "last_position": "paragraph:42" }` |

---

## Explanations

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| GET    | `/sources/:id/explanations`   | List explanations for a source (both system and user). |
| POST   | `/explanations`               | Create a user explanation. Body: `{ "source_id": 1, "text_range": {...}, "content": "..." }` |
| PUT    | `/explanations/:id`           | Update explanation (only if `editable` is true). |
| DELETE | `/explanations/:id`           | Delete user explanation. |

---

## Favorites

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| GET    | `/favorites`                  | List user's favorite items. |
| POST   | `/favorites`                  | Add a favorite. Body: `{ "text": "word", "type": "word", "note": "optional" }` |
| PUT    | `/favorites/:id`              | Update note or type. |
| DELETE | `/favorites/:id`              | Remove from favorites. |

---

## Comments

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| GET    | `/comments`                   | List comments. Requires `target` query param: `target=quiz:123` or `target=question:456`. Supports pagination. |
| POST   | `/comments`                   | Create a comment. Body: `{ "target_type": "quiz", "target_id": 123, "content": "...", "parent_id": null }` |
| PUT    | `/comments/:id`               | Edit own comment. Body: `{ "content": "..." }` |
| DELETE | `/comments/:id`               | Soft delete own comment (or admin). |
| POST   | `/comments/:id/report`        | Report a comment. Body: `{ "reason": "spam" }` |

---

## Reports (Admin only)

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| GET    | `/reports`                    | List unresolved reports. |
| POST   | `/reports/:id/resolve`        | Mark a report as resolved. Body: `{ "action_taken": "disabled quiz" }` |

---

## LLM (AI) Operations

All LLM endpoints accept a request and return a job ID. the frontend can poll or use WebSocket for completion (not specified, but typical pattern). For simplicity, we'll define synchronous‑style endpoints that queue and return immediately with a job ID, and a separate status endpoint.

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| POST   | `/llm/explain`                | Request explanation for selected text. Body: `{ "source_id": 1, "text_range": {...} }` |
| POST   | `/llm/generate-questions`     | Generate questions from source text. Body: `{ "source_id": 1, "count": 5 }` |
| POST   | `/llm/summarize`              | Summarize source. Body: `{ "source_id": 1 }` |
| POST   | `/llm/grammar-check`          | Check grammar of selected text. Body: `{ "text": "..." }` |
| GET    | `/llm/jobs/:job_id`           | Get status/result of an LLM job. |

---

## Admin

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| GET    | `/admin/users`                | List all users (with filters: role, status). |
| POST   | `/admin/users/:id/ban`        | Ban a user. |
| POST   | `/admin/users/:id/unban`      | Unban a user. |
| GET    | `/admin/quizzes`              | List all quizzes (with filters). |
| POST   | `/admin/quizzes/:id/disable`  | Disable a quiz (no new attempts). |
| POST   | `/admin/quizzes/:id/enable`   | Re‑enable a quiz. |
| GET    | `/admin/comments`             | List all comments (with filters). |
| DELETE | `/admin/comments/:id`         | Soft delete any comment. |
| POST   | `/admin/comments/:id/restore` | Restore a soft‑deleted comment. |

---

## Search

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| GET    | `/search`                     | Global search. Query param `q=...`. Optionally filter by `type` (quiz, question, source, favorite). Returns paginated mixed results with type indicator. |

---

## Tags

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| GET    | `/tags`                       | List all tags used across quizzes/questions (with usage count). Supports prefix search via `q` param. |

---

## Data Models (Selected)

**User**
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "email_confirmed": true,
  "role": "user",
  "status": "active",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Quiz**
```json
{
  "id": 10,
  "title": "Math Basics",
  "description": "Simple arithmetic",
  "user_id": 1,
  "visibility": "public",
  "note_id": null,
  "created_at": "...",
  "updated_at": "...",
  "tags": ["math", "addition"],
  "question_count": 5,
  "attempt_count": 42
}
```

**Question** (bank)
```json
{
  "id": 100,
  "type": "multiple_choice",
  "content": "What is 2+2?",
  "explanation": "Basic addition",
  "metadata": {
    "options": [
      {"id": "a", "text": "3"},
      {"id": "b", "text": "4"},
      {"id": "c", "text": "5"}
    ],
    "correct": ["b"]
  },
  "created_at": "...",
  "updated_at": "...",
  "tags": ["math"]
}
```

**QuizQuestion** (as stored in quiz)
```json
{
  "id": 200,
  "quiz_id": 10,
  "original_question_id": 100,
  "type": "multiple_choice",
  "content": "What is 2+2?",
  "explanation": "...",
  "metadata": { ... },
  "display_order": 1,
  "created_at": "...",
  "mismatch": false   // only in edit view
}
```

**Source**
```json
{
  "id": 300,
  "type": "pdf",
  "title": "My Notes",
  "url": null,
  "content": "<p>Rich text...</p>",
  "raw_text": "Plain text...",
  "created_at": "...",
  "updated_at": "..."
}
```

**Attempt**
```json
{
  "id": 400,
  "quiz_id": 10,
  "user_id": 1,
  "start_time": "...",
  "end_time": null,
  "score": null,
  "max_score": 5,
  "status": "in_progress"
}
```

---

## Notes

- All `POST`, `PUT`, `DELETE` endpoints return the created/updated resource or a success message.
- File uploads for sources use `multipart/form-data` with fields: `file` (for PDF/TXT) or `text` (for plain text) or `url` (for link import).
- Admin endpoints require `role=admin` in the session.
- Rate limits are enforced per IP (see design doc). Responses may include `X-RateLimit-*` headers.
- Session cookie name: `slp_session` (HTTP‑only, Secure, SameSite=Lax).
- For paginated lists, the response envelope is:
  ```json
  {
    "data": [...],
    "total": 100,
    "page": 1,
    "limit": 20
  }
  ```
- Error codes follow resource‑action conventions, e.g., `AUTH_INVALID_CREDENTIALS`, `QUIZ_NOT_FOUND`, `VALIDATION_ERROR`.

This API design covers all major features described in the SLP design document, including authentication, content management, learning interactions, and administrative functions.