# SLP — Self Learning Platform (Concise Design Document)

## 1. Overview
Personal learning platform for individuals to learn via quizzes, flashcards, reading, notes, and AI assistance. Focus: language & general knowledge. Users work individually; minimal interaction (public quizzes, comments). Public content discoverable via search.

## 2. Users & Authentication
- **Account fields**: id, username (unique, immutable), password_hash (Argon2id), email (optional, can be verified, immutable once confirmed), email_confirmed, role (user/admin), status, timestamps.
- **Login**: username + password only; cookie‑based sessions (HTTP‑only, 7 days). No OAuth.
- **Password reset**: single‑use token links (30 min expiry).
- **Email verification**: 6‑digit OTP (10 min expiry, max 5 resends/hr, 10 attempts).
- **Account deletion**: Not allowed by user; admins can ban (redirect to banned page).
- **Admin capabilities**: ban users, disable quizzes, moderate comments.

## 3. Quiz System
- **Quiz table**: id, title, description, user_id, visibility (public/private), note_id (optional), timestamps.
- **Sources** (books, links, personal notes): table with type, title, url, content (rich text), raw_html, raw_text. Users upload PDF/TXT, paste text, or import links (HTML fetched → cleaned with Readability). PDF text extraction via Apache PDFBox (max 20 MB, 5 MB for TXT). Max processed text 100k chars.
- **Quiz–Source**: many‑to‑many via `quiz_source`.
- **Quiz–Note**: many‑to‑many via `quiz_note`; notes are user‑created explanations/reminders.
- **Quiz attempts**: unlimited, store full snapshots.
  - `quiz_attempt`: id, user_id, quiz_id, start/end time, score, max_score, question_count, status (completed/abandoned).
  - `quiz_attempt_answer`: attempt_id, question_id, question_snapshot (JSON), answer_json, is_correct.
  - Unfinished attempts auto‑abandon after 24 hrs; resume allowed within that window.
- **Attempt review**: users can see past attempts, incorrect answers, stats.
- **Quiz timing**: no timer; users can take as long as needed.
- **Quiz editing**: allowed after attempts exist; edits do not affect existing attempts (snapshots preserved). New attempts use latest version.
- **Visibility**: private → hidden from search/comments, no new attempts; visible to creator. Admin‑disabled quizzes block new attempts but remain viewable to creator.

## 4. Question System
- **Question bank** (`question`): id, type, content, explanation, metadata (JSON), timestamps.
- **Quiz question cloning**: quizzes use `quiz_question` table with copy of question data + original_question_id, display_order. Ensures quiz stability.
- If bank question changes, quizzes show a mismatch notification; deletion of bank question does not affect quizzes.
- **Types**: multiple_choice, single_choice, fill_blank, ordering, matching, true_false, flashcard.
- **Metadata schemas** (examples):
  - multiple/single choice: `{options: [{id,text}], correct: [ids]}`
  - fill_blank: `{answers: ["answer1"]}` (case‑insensitive match)
  - ordering: `{items: ["A","B"], correct_order: [2,1]}`
  - matching: `{pairs: [{left, right}]}`
  - true_false: `{correct: true}`
  - flashcard: `{front, back}`
- **Scoring**: 1 point per question, exact match only (no partial).
- **Randomization**: optional random question order (flashcards grouped first, then scored questions randomized) and random answer order.

## 5. Flashcards
- Informational, unscored questions. Can appear interleaved in quizzes.
- Spaced repetition **not** implemented.

## 6. Reading System
- Sources stored with rich text (TipTap JSON), raw_html, raw_text.
- **Text interaction**: select text → bubble popover → modal with actions:
  1. **Explain**: check internal DB; user can add personal explanation; optionally generate via LLM.
  2. **Grammar check**: returns incorrect parts, corrected text, explanation (no auto‑apply).
  3. **TTS**: read selected text (English only, Piper TTS, max 500 chars).
  4. **Add to favorites** (see §8).
- Highlights are temporary (browser selection only).

## 7. LLM Integration
- Local models via llama.cpp (Mistral 7B Instruct). Max input 4000 tokens.
- **Prompts** enforce JSON output where required; backend validates JSON.
- **Question generation**: from text; user selects number of questions (max based on content). Output structured JSON; user must review/edit before saving.
- **Quiz generation**: from text, with user‑selected question count.
- **Summarization**: free‑form text, stored.
- **Grammar checking**: as above.
- **Logging**: all requests stored indefinitely (`llm_log`).
- **Safety**: JSON validation only; duplicate questions allowed; web content parsed without LLM to avoid prompt injection.

## 8. Favorites
- Personal vocabulary notebook: `favorite_item` (id, user_id, text, type (word/phrase/idiom/other), note, timestamps).
- Editable, deletable. Not linked automatically to other entities. No spaced repetition.

## 9. Tagging
- Global, flat tags (`tag` with name, normalized lowercase). Many‑to‑many with quizzes and questions via `quiz_tag`, `question_tag`. Max 10 tags per entity.
- Created by entering comma‑separated values.

## 10. Search
- PostgreSQL Full‑Text Search (language = simple). Pagination 20 items.
- **Searchable**: quizzes (title, description, tags, question content), questions (content, explanation, tags), sources (title, text), favorites.
- **Ranking**: exact match in title → exact match other fields → fuzzy title → fuzzy other.

## 11. Moderation
- Users can report quizzes, questions, comments (`report` table).
- Admin actions (bans, disable quizzes/comments) logged in `admin_log`.
- Soft delete for comments (displayed as "deleted comment").
- Deleted sources soft‑deleted (`deleted_at`), remain attached to quizzes but hidden from search.

## 12. System Architecture
- Frontend ↔ Backend API (REST + procedure‑style) ↔ PostgreSQL.
- Additional services: LLM (llama.cpp), TTS (Piper).
- Business logic in backend.

## 13. Storage & Performance
- Expected users: ~1000.
- Heavy storage: sources, quiz attempts, LLM logs – all in PostgreSQL.
- Uploaded files (PDF, TXT) stored on filesystem with metadata in DB.
- Indexes on large tables (attempts, answers, comments, reports).
- Rate limiting: login (10/min), comments (20/min), quiz attempts (30/hr), LLM (10/hr).

## 14. Security
- Password hashing: Argon2id (64 MB, 3 passes, 1 thread).
- Sessions: cookie‑based, HTTP‑only, expire after 7 days.
- HTML sanitization (rich text): remove script, iframe, object, embed, onclick, javascript: links.
- File size limits: PDF 20 MB, TXT 5 MB.
- Rate limiting as above.

## 15. Additional Design Clarifications

### 15.1 Relationships (Core Tables)
```
User
 ├── Sources
 ├── Questions (bank)
 ├── Quizzes
 │    ├── quiz_source (m:m)
 │    ├── quiz_note (m:m)
 │    └── quiz_question (cloned)
 ├── Favorites
 └── QuizAttempts
      └── QuizAttemptAnswers
```

### 15.2 Content Lifecycle
- Sources: soft delete.
- Quizzes: private/disabled states; creator always sees own.
- Comments: soft delete, nested replies max depth 5, editable with `edited_at`.
- Reports: target_type + target_id, reason.

### 15.3 API Examples
```
POST   /auth/login
POST   /quiz
GET    /quiz/:id
POST   /quiz/:id/attempt
POST   /attempt/:id/answer
POST   /attempt/:id/submit
POST   /sources
POST   /comment
```

### 15.4 Backup
- Daily PostgreSQL dump + file storage backup, retained 30 days.

### 15.5 UI/UX
- Mobile‑first design.
- Text selection bubble with actions.
- Quiz player: navigate freely, change answers before submit, manual submission.
- Reading progress tracking (resume later).

### 15.6 Miscellaneous
- View counting: 1 view per IP per hour.
- Quiz player auto‑saves answers periodically.
- No rating system.
- Attempt snapshots ensure historical consistency.
- Question mismatch notification when bank question changes.

### 16.1 Authentication & User Management

- **Email requirements**: Email is not **required** for registration.
- **Email verification**: Users can verify their email via the profile page. Verification is **optional** but recommended. Unverified emails do not block login or basic usage.
- **Account deletion**: Not allowed by users. Admins can ban accounts. Do not implement privacy regulations.
- **Password reset flow**: Uses single‑use tokens sent to the registered email. Tokens expire after 30 minutes.

### 16.2 Content Processing & External Services

- **PDF/Text extraction**: Handled by a dedicated **microservice** (separate from the main backend). It exposes a REST API that accepts file uploads, extracts text using Apache PDFBox (or equivalent library), and returns plain text. The main backend stores the extracted text in the `source` table.
- **LLM integration (llama.cpp)**:
  - Requests are placed into an **Apache Kafka** queue to serialize processing and avoid overloading the local model.
  - A consumer service picks up jobs, calls llama.cpp, and stores results in the `llm_log` table.
  - No GPU constraints (runs on personal laptop CPU).
- **TTS (Piper)**: Similarly, TTS requests are queued via Kafka. A consumer calls the Piper CLI or HTTP endpoint and returns the audio data (or a URL) to the frontend.
- **Email delivery**: A separate lightweight email service (e.g., **Postal**, **Mailcow**, or a simple SMTP server) handles all outgoing emails. The main backend sends email requests via HTTP or SMTP.

### 16.3 Data Model & Storage

- **Reading progress**: New table `user_source_progress`:
  ```sql
  CREATE TABLE user_source_progress (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES user(id) ON DELETE CASCADE,
      source_id INT REFERENCES source(id) ON DELETE CASCADE,
      last_position TEXT,        -- e.g., paragraph index or character offset
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, source_id)
  );
  ```
- **Explain feature**: New table `explanation`:
  ```sql
  CREATE TABLE explanation (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES user(id) ON DELETE CASCADE, -- NULL for system-generated
      source_id INT REFERENCES source(id) ON DELETE CASCADE,
      text_range JSONB,           -- {start: int, end: int} or {paragraph: int, offset: int}
      content TEXT NOT NULL,
      author_type VARCHAR(10) CHECK (author_type IN ('system', 'user')),
      editable BOOLEAN DEFAULT true, -- user explanations can be edited; system ones cannot
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP
  );
  ```
- **Quiz question mismatch detection**: When fetching a quiz for editing, the backend checks each `quiz_question` against its `original_question_id` (if any). If the bank question’s `updated_at` is newer than the `quiz_question.created_at`, the response includes a `mismatch: true` flag per question. The UI displays a warning icon next to such questions.
- **Soft‑deleted sources**: When a source is soft‑deleted (`deleted_at` set), it becomes **completely invisible** in all UI contexts, including quizzes that reference it. The `quiz_source` link remains in the database but is ignored in all queries. Quiz questions derived from the source are unaffected (they are snapshots).

### 16.4 Security & Rate Limiting

- **Rate limiting**: All rate limits are enforced **per IP address** using Redis. Limits:
  - Login: 10 requests/minute
  - Comments: 20 requests/minute
  - Quiz attempts: 30/hour
  - LLM requests: 10/hour
- **Session storage**: Stored in Redis with a 7‑day TTL. Session cookie is HTTP‑only and secure.
- **HTML sanitization**: A dedicated microservice (or library) sanitizes rich text. **Allowed tags and attributes**:
  ```
  Tags: p, br, strong, em, u, s, ul, ol, li, blockquote, pre, code, a, img, h1, h2, h3, h4, h5, h6, span, div
  Attributes (global): class, id
  a: href, target="_blank"
  img: src, alt, width, height (all URLs must be HTTPS)
  ```
  All `on*` attributes, `javascript:`, `iframe`, `object`, `embed`, `script` are stripped.
- **File upload security**: No virus scanning. File size limits: PDF ≤20 MB, TXT ≤5 MB.

### 16.5 Business Logic & Features

- **Tag moderation**: No moderation. Tags are free‑form text, normalized to lowercase. Users can create any tags.
- **LLM log retention**: Logs are stored indefinitely for debugging and improvement. No automatic anonymization.
- **Admin dashboard**:
  - **Users**: List all users with search/filter. Actions: ban, unban, view details (profile, quiz count, reports). Banned users see a “banned” message on login.
  - **Quizzes**: List quizzes with visibility and status. Actions: disable (prevent new attempts), enable, delete (soft).
  - **Comments**: List comments with reply threads. Actions: soft‑delete, restore.
  - **Reports**: List unresolved reports (target type: quiz, question, comment). Actions: mark as resolved, take action on target (e.g., disable quiz, delete comment). All actions logged in `admin_log`.
  - **System logs**: Optional view of `admin_log` and `llm_log` (for troubleshooting).
  - **UI**: Sidebar navigation, tables with pagination (20 items), modals for confirmations.
- **Concurrency in quiz attempts**: Not handled. In the rare event of simultaneous submissions, last write wins. This is considered acceptable.

### 16.6 Technical Architecture & API Design

- **Backend API**: RESTful with some RPC-style actions. Base URL: `/api/v1/`. All endpoints return JSON.
  ```
  Authentication
  POST   /auth/login          – username/password → set cookie
  POST   /auth/logout
  POST   /auth/reset-password – request token
  POST   /auth/reset-password/confirm – set new password
  POST   /auth/verify-email   – submit OTP

  Users
  GET    /users/me
  PUT    /users/me            – update profile (email, etc.)
  POST   /users/me/verify-email/send – request OTP

  Quizzes
  GET    /quizzes             – list (with filters: visibility, tags)
  POST   /quizzes             – create
  GET    /quizzes/:id
  PUT    /quizzes/:id         – update
  DELETE /quizzes/:id         – soft delete (admin only)
  POST   /quizzes/:id/duplicate
  GET    /quizzes/:id/edit    – detailed for editing (includes mismatch info)

  Quiz attempts
  POST   /quizzes/:id/attempts            – start new attempt
  GET    /attempts/:id                     – get current attempt state
  POST   /attempts/:id/answers             – submit an answer (last write wins)
  POST   /attempts/:id/submit               – finish attempt
  GET    /attempts/:id/review                – review completed attempt

  Sources
  POST   /sources               – upload file or paste text
  GET    /sources/:id
  DELETE /sources/:id            – soft delete
  GET    /sources/:id/progress   – get reading progress
  PUT    /sources/:id/progress   – update reading progress

  Explanations
  GET    /sources/:id/explanations
  POST   /explanations           – create (user)
  PUT    /explanations/:id       – edit (if editable)
  DELETE /explanations/:id

  Favorites
  GET    /favorites
  POST   /favorites
  PUT    /favorites/:id
  DELETE /favorites/:id

  Comments
  GET    /comments?target=quiz:123
  POST   /comments
  PUT    /comments/:id
  DELETE /comments/:id            – soft delete
  POST   /comments/:id/report

  Reports
  GET    /reports                 – admin only
  POST   /reports/:id/resolve     – admin only

  LLM
  POST   /llm/explain             – queue explanation request
  POST   /llm/generate-questions   – queue question generation
  POST   /llm/summarize
  POST   /llm/grammar-check

  Admin
  GET    /admin/users
  POST   /admin/users/:id/ban
  POST   /admin/users/:id/unban
  GET    /admin/quizzes
  POST   /admin/quizzes/:id/disable
  POST   /admin/quizzes/:id/enable
  GET    /admin/comments
  DELETE /admin/comments/:id       – soft delete
  POST   /admin/comments/:id/restore
  ```

- **Frontend text selection (mobile)**:
  - When the user selects text via tap‑and‑hold, the native selection handles appear.
  - Upon releasing the selection, a **floating bubble menu** appears near the selected text (positioned above or below, avoiding handles).
  - The bubble contains icons/buttons: **Explain**, **Grammar**, **TTS**, **Add to favorites** (if applicable). Tapping an icon opens a modal with the corresponding action (e.g., show explanation, listen).
  - On small screens, the bubble is touch‑friendly (minimum tap target 44×44 px) and can be dismissed by tapping outside.
  - For long selections, the bubble remains anchored to the selection while the user scrolls (if possible).