# SLP — Self Learning Platform: Service Design Overview

## 1. System Overview
SLP is a personal learning platform enabling individuals to learn via quizzes, flashcards, reading materials, and AI‑assisted explanations. The system is built for **~1000 concurrent users**, with a focus on language and general knowledge. Users work independently, with minimal social features (public quizzes, comments). All content is discoverable through search.

**Core Capabilities**  
- User authentication (username/password, optional email verification, password reset).  
- Quiz creation, taking, and review (snapshots ensure historical consistency).  
- Reading with rich text, text selection actions (explain, grammar, TTS, favorites).  
- AI integration via local LLM (llama.cpp) for explanation, question generation, summarization, and grammar checking.  
- Personal vocabulary notebook (favorites).  
- Tagging, full‑text search, and moderation tools for admins.

## 2. High‑Level Architecture
The platform follows a **service‑oriented** design with clear separation of concerns. All components run on a single server (personal laptop) but are decoupled to allow future scaling.

```
┌─────────────┐      ┌─────────────────────────────────────────────┐
│   Browser   │◄────►│              Backend API (Dotnet)           │
│(Mobile‑First│      │  - Authentication, Quiz, Reading, Search    │
│    Web App) │      │  - Business Logic, Rate Limiting            │
└─────────────┘      └─────────────────────┬───────────────────────┘
                                            │
                                            ▼
              ┌─────────────────────────────────────────────┐
              │              PostgreSQL                     │
              │  - Core tables (users, quizzes, questions)  │
              │  - Full‑text search, JSONB for metadata     │
              │  - Attempt snapshots, LLM logs              │
              └─────────────────────────────────────────────┘
                                            ▲
              ┌─────────────────────────────┼─────────────────────┐
              │                             │                     │
              ▼                             ▼                     ▼
   ┌──────────────────┐          ┌────────────────── ┐  ┌──────────────────┐
   │  Microservices   │          │    Message Queue  │  │   Redis          │
   │ - PDF/TXT Extract│          │     (Redis)       │  │ - Rate limiting  │
   │ - LLM (llama.cpp)│◄────────►│ - Request queue   │  │ - Session store  │
   │ - TTS (Piper)    │          │ - Async processing│  │ - Caching        │
   │ - Email          │          └────────────────── ┘  └──────────────────┘
   └──────────────────┘
```
- **Frontend**: Single‑page application (mobile‑first), communicates with backend via REST API.  
- **Backend API**: Handles all user requests, enforces business rules, and orchestrates interactions with auxiliary services.  
- **Database**: PostgreSQL stores all persistent data (users, quizzes, sources, attempts, logs). Full‑text search (GIN indexes) and JSONB for flexible metadata.  
- **Microservices**: Isolated services for heavy or specialised tasks:
  - **PDF/TXT extraction**: Accepts file uploads, extracts plain text using Apache PDFBox, returns text to backend.
  - **LLM service**: Processes AI requests (explain, generate questions, summarise, grammar). Uses llama.cpp (Mistral 7B) running locally.
  - **TTS service**: Converts selected text to speech via Piper TTS (English only).
  - **Email service**: Sends verification OTPs and password‑reset links via SMTP or a lightweight mail server.
- **Message Queue (Redis)**: Decouples LLM and TTS requests from the main backend. Enables serialised processing and prevents overload.
- **Redis**: Used for rate‑limiting counters, session storage (HTTP‑only cookies, 7‑day TTL), and optional caching.

## 3. Core Services & Components

### 3.1 Frontend
- **Technology**: Modern JavaScript framework (e.g., Vue/React) with responsive design.  
- **Key Features**:
  - Quiz player with free navigation, answer changes, manual submission.
  - Reading view with rich text rendering (TipTap JSON) and text‑selection bubble (explain, grammar, TTS, add to favorites).
  - Search interface with pagination and ranking.
  - Admin dashboard for moderation.

### 3.2 Backend API
- **REST + RPC style** endpoints (see §16.6 in design doc).  
- **Responsibilities**:
  - Authentication (session management, password hashing with Argon2id).
  - CRUD for quizzes, questions, sources, favorites.
  - Quiz attempt handling (start, answer, submit) with snapshot creation.
  - Source management (upload, progress tracking).
  - Commenting and reporting.
  - Orchestration of async LLM tasks (publish to Redis, poll for results).
  - Rate limiting (Redis counters) and input validation.
  - Admin actions (ban users, disable content).

### 3.3 Database (PostgreSQL)
- **Main Tables** (as per design):
  - `user`, `source`, `question`, `quiz`, `quiz_question`, `quiz_attempt`, `quiz_attempt_answer`, `favorite_item`, `tag`, `comment`, `report`, `explanation`, `user_source_progress`, `llm_log`, `admin_log`.
- **Indexing**: Heavy indexing on foreign keys, `updated_at` for mismatch detection, full‑text search columns (GIN).
- **JSONB**: Used for question metadata, answer snapshots, text range in explanations.
- **Soft deletes**: Implemented via `deleted_at` for sources, comments, quizzes (admin‑only).

### 3.4 Microservices

#### PDF/TXT Extraction Service
- **Input**: File upload (PDF ≤20 MB, TXT ≤5 MB).  
- **Processing**: Apache PDFBox (or equivalent) extracts text; plain text returned to backend.  
- **Communication**: Synchronous HTTP call from backend (files small, processing fast). No queue needed.

#### LLM Service (llama.cpp)
- **Input**: Prompt (max 4000 tokens) with instructions to produce JSON output.  
- **Processing**: llama.cpp runs locally (CPU). Output is validated by backend.  
- **Queueing**: Backend publishes request to Redis (`llm_requests` topic). Consumer picks up, calls llama.cpp, stores result in `llm_log`, and optionally notifies frontend via polling or WebSocket (future).  
- **Logging**: All requests/responses stored indefinitely in `llm_log`.

#### TTS Service (Piper)
- **Input**: Text snippet (≤500 chars, English).  
- **Processing**: Piper CLI or HTTP endpoint generates audio.  

#### Email Service
- **Input**: Recipient, subject, plain/html body.  
- **Processing**: Lightweight SMTP server (e.g., Postal, Mailcow) or direct SMTP.  
- **Communication**: Backend sends HTTP request or drops message into a dedicated queue.

### 3.5 Message Queue (Redis)
- **Topics**: `llm_requests`, `tts_requests`, `email_requests`.  
- **Purpose**:
  - Serialise LLM/TTS processing to avoid overloading local resources.
  - Provide retry and fault tolerance.
  - Decouple backend from slow external services.
- **Consumers**: Single consumer per topic (running on same server) processes jobs sequentially.

### 3.6 Redis
- **Session store**: Key‑value with 7‑day TTL; session cookie contains only session ID.  
- **Rate limiting**: Counters per IP for each endpoint family (login, comments, quiz attempts, LLM).  
- **Caching**: Optional – e.g., quiz metadata for public lists, tag suggestions.

### 3.7 File Storage
- **Location**: Local filesystem (or mounted volume).  
- **Stored files**: Uploaded PDF/TXT files (originals kept for reprocessing if needed).  
- **Backup**: Daily backups of database and file storage, retained 30 days.

## 4. Key Functional Modules

### 4.1 Authentication & User Management
- Registration with username (unique, immutable) and optional email.  
- Email verification via 6‑digit OTP (10‑min expiry, 5 resends/hour, 10 attempts).  
- Password reset via single‑use token link (30‑min expiry).  
- Login sessions: HTTP‑only cookie, 7 days, stored in Redis.  
- No self‑deletion; admins can ban accounts. Banned users see a message on login.

### 4.2 Quiz System
- **Quiz creation**: Title, description, visibility (public/private), optional note association.  
- **Sources**: Upload PDF/TXT, paste text, or import links (HTML fetched, cleaned with Readability). Extracted text stored in `source` table.  
- **Question bank**: Reusable questions with metadata. Quizzes clone questions into `quiz_question` for stability.  
- **Attempts**:
  - Unlimited attempts, each stores snapshot of questions and answers.
  - Auto‑abandon after 24 hours; resume allowed within that window.
  - No timer; users can take as long as needed.
- **Review**: Users see past attempts, incorrect answers, stats.
- **Editing**: Changing a quiz does not affect existing attempts; mismatch warning if bank question updated.

### 4.3 Reading System
- **Sources** stored with rich text (TipTap), raw HTML, and plain text.  
- **Progress tracking**: `user_source_progress` stores last position (e.g., paragraph index).  
- **Text selection actions**:
  - **Explain**: Show existing explanation (system/user) or trigger LLM to generate one (queued).
  - **Grammar check**: LLM returns incorrect parts + corrected text.
  - **TTS**: Queued Piper request; audio played in browser.
  - **Add to favorites**: Save selected text as a vocabulary item.
- **Explanations**: Stored in `explanation` table, can be user‑generated (editable) or system‑generated (uneditable).

### 4.4 LLM Integration
- **Use cases**: Explanation, question generation, summarization, grammar checking.  
- **Workflow**:
  1. Frontend requests LLM action → backend validates input and creates a job in Redis.
  2. Consumer processes job, calls llama.cpp, stores result in `llm_log`.
  3. Frontend polls (or uses WebSocket) to retrieve result.
- **Prompts**: Engineered to output JSON; backend validates JSON structure.
- **Safety**: No HTML parsing; only plain text sent to LLM.

### 4.5 Favorites & Tagging
- **Favorites**: Personal vocabulary notebook – free‑form text + type (word/phrase/idiom/other) + optional note.
- **Tagging**: Flat tags (lowercase, unique). Applied to quizzes and questions (max 10 per entity). Created on the fly.

### 4.6 Search
- PostgreSQL Full‑Text Search (language = simple).  
- Searchable entities: quizzes (title, description, tags, question content), questions, sources, favorites.  
- Ranking: exact title match → exact other → fuzzy title → fuzzy other.

### 4.7 Moderation & Admin
- **Reports**: Users can report quizzes, questions, comments.  
- **Admin dashboard**:
  - User management (ban/unban, view details).
  - Quiz moderation (disable/enable, soft delete).
  - Comment moderation (soft delete/restore).
  - Report resolution (mark resolved, take action on target).
- **Logging**: All admin actions recorded in `admin_log`.

## 5. Data Flow Examples

### 5.1 Starting a Quiz Attempt
1. User clicks “Start” on a quiz → `POST /quizzes/:id/attempts`.
2. Backend creates a new `quiz_attempt` record (status = 'in_progress').
3. For each `quiz_question`, a snapshot is taken (question content, options, etc.) and stored in `quiz_attempt_answer` (initially empty).
4. Returns attempt ID and first question.

### 5.2 Submitting an Answer
1. User answers → `POST /attempts/:id/answers` with question index and answer data.
2. Backend updates the corresponding `quiz_attempt_answer` row (last write wins; no concurrency handling).
3. Returns next question or summary.

### 5.3 LLM Explanation Request
1. User selects text in reading view and taps “Explain”.
2. Frontend calls `POST /llm/explain` with source ID and text range.
3. Backend checks if an explanation already exists (user or system). If not, publishes a job to Redis `llm_requests`.
4. Consumer processes job: calls llama.cpp, stores result in `llm_log` and as a system explanation in `explanation` table.
5. Frontend polls `/explanations?source=...` until new explanation appears, then displays it.

## 6. Security & Performance Considerations

- **Authentication**: Argon2id for password hashing; HTTP‑only cookies; rate limiting on login (10/min).  
- **Input validation**: All user input sanitised; HTML sanitisation removes scripts, event handlers, and non‑HTTPS image sources.  
- **File uploads**: Size limits (PDF 20 MB, TXT 5 MB); no virus scanning (accepting risk for personal laptop).  
- **Rate limiting**: Enforced per IP via Redis for critical endpoints.  
- **Concurrency**: Minimal; last‑write‑wins for quiz answers is acceptable.  
- **Backup**: Daily PostgreSQL dump + file backup, retained 30 days.  
- **Performance**: Indexes on large tables; full‑text search uses GIN; LLM/TTS queues prevent resource exhaustion.

## 7. Deployment Notes

- All components run on a single Linux server (personal laptop).  
- Services are containerised (Docker) for ease of management:  
  - Backend API container  
  - PostgreSQL container  
  - Redis container  
  - Microservice containers (extraction, LLM, TTS, email)  
- LLM service requires llama.cpp compiled for CPU (no GPU).  
- TTS uses Piper with pre‑downloaded English voice.  
- Environment variables manage configuration (database URLs, Redis, etc.).  
- Nginx serves as reverse proxy for frontend static files and API.

---

This overview captures the essential services and their interactions, providing a solid foundation for implementation and future scaling.