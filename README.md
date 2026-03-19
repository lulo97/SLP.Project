# Self Learning Platform (SLP)

SLP is a personal learning platform designed for individuals to learn via quizzes, flashcards, reading, notes, and AI‑assisted explanations. It focuses on language learning and general knowledge, offering a rich set of tools for self‑study. Built with a modular microservices architecture, SLP runs entirely on your own infrastructure, keeping your data private and under your control.

---

## Features

### 📚 Core Learning Tools
- **Quizzes**: Create, share, and take quizzes with multiple question types (multiple choice, single choice, true/false, fill in the blank, ordering, matching, flashcards). Quizzes can be public or private.
- **Question Bank**: Maintain a personal library of questions that can be reused across quizzes. Changes to bank questions don’t affect existing quiz attempts (snapshots are taken).
- **Sources**: Upload PDF/TXT files, add web links, or paste notes. Sources are stored with rich text (TipTap JSON) and full‑text searchable.
- **Reading Progress**: Track your position in a source and resume later.
- **Text Interaction**: Select any text in a source to:
  - **Explain**: View a saved explanation or generate one via local LLM.
  - **Grammar Check**: Get corrections and explanations.
  - **TTS (Text‑to‑Speech)**: Listen to selected text (English only, via Piper).
  - **Add to Favorites**: Save words/phrases to a personal vocabulary notebook.

### 🤖 AI Integration (Local & Private)
- **LLM (Large Language Model)**: Uses a local `llama.cpp` server (e.g., Mistral 7B) to generate explanations, questions, summaries, and grammar checks. All requests are logged; results are cached.
- **TTS (Text‑to‑Speech)**: Piper provides high‑quality, offline voice synthesis. Audio is cached for repeated requests.
- **All AI services run on your own hardware** – no external API calls, no data leakage.

### 🔐 User & Access Control
- Simple username/password authentication with Argon2id hashing.
- Session‑based (HTTP‑only cookie) with Redis‑backed storage.
- Email verification (optional) and password reset via single‑use tokens.
- Admin roles for moderation (ban users, disable quizzes/comments).

### 🔍 Search & Discovery
- Full‑text search across quizzes, questions, sources, and favorites using PostgreSQL.
- Public quizzes are discoverable via search; private content is hidden.

### 🗣️ Community & Moderation
- Nested comments on quizzes, questions, and sources (max depth 5). Comments can be edited, soft‑deleted, and restored.
- Users can report inappropriate content; admins review and act.
- All admin actions are logged.

### 📊 Attempt Tracking & Analytics
- Unlimited quiz attempts; each attempt stores a snapshot of the questions at that moment.
- Review past attempts with correct/incorrect answers and scores.
- Auto‑abandon incomplete attempts after 24 hours.

### ⚙️ Extensible & Self‑Contained
- All services are containerised with Docker Compose.
- Lightweight enough to run on a personal laptop (CPU only, no GPU required).
- Designed for ~1000 users; PostgreSQL handles the data.

---

## Architecture Overview

SLP follows a microservices approach with a central backend, a Vue.js frontend, and supporting AI/infrastructure services.

```
┌─────────────┐      ┌─────────────┐
│   Browser   │ ───▶ │   Vue 3     │
│  (Mobile)   │ ◀──  │  Frontend   │
└─────────────┘      └─────────────┘
                           │
                           │ HTTP (REST)
                           ▼
┌─────────────────────────────────────┐
│       Backend (ASP.NET Core)        │
│  - Authentication & Sessions        │
│  - Business Logic (Quiz, Source…)   │
│  - Queued LLM requests               │
└─────────────────────────────────────┘
       │            │            │
       ▼            ▼            ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│PostgreSQL │ │  Redis    │ │   Email   │
│ (main DB) │ │(cache,    │ │(lightweight│
└───────────┘ │ rate limit)│ │  service) │
              └───────────┘ └───────────┘
       │            │            │
       ▼            ▼            ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│  llama.cpp│ │  Piper    │ │  Parser   │
│(LLM server)│ │(TTS)      │ │(PDF/text  │
└───────────┘ └───────────┘ │ extraction)│
              │              └───────────┘
              ▼
       ┌───────────┐
       │Piper Gateway│
       │(caching &   │
       │  REST API)  │
       └───────────┘
```

- **Backend** (.NET 10) – exposes a RESTful API, handles authentication, business logic, and queues LLM requests.
- **Frontend** (Vue 3 + TypeScript) – mobile‑first SPA, consumes backend API.
- **Database** – PostgreSQL 17 stores all application data.
- **Redis** – used for caching, rate limiting, and as a queue for LLM jobs.
- **LLM Server** – `llama.cpp` running a quantised model (e.g., Qwen2.5‑7B‑Instruct.Q4_K_M.gguf). Accepts chat completion requests.
- **TTS Services** – Piper (Wyoming protocol) + a Python gateway that caches audio and provides a REST API.
- **Parser Service** – Extracts text from PDF and TXT files.
- **File Storage Service** – Handles file uploads (PDF, images for avatars) and serves them.
- **Email Service** – Minimal Node.js app that sends emails via SMTP.

All services communicate over HTTP (or TCP for Wyoming). The backend uses `HttpClient` to call the parser, file storage, TTS gateway, and email service.

---

## Tech Stack

| Area            | Technology                                                                 |
|-----------------|----------------------------------------------------------------------------|
| **Backend**     | ASP.NET Core 10 (.NET 10), Entity Framework Core, Npgsql, Serilog, Swagger |
| **Frontend**    | Vue 3, TypeScript, Vite, Pinia, Vue Router, Ant Design Vue, Tailwind CSS  |
| **Database**    | PostgreSQL 17                                                              |
| **Caching**     | Redis 7                                                                    |
| **LLM**         | llama.cpp server (CPU)                                                     |
| **TTS**         | Piper (Wyoming) + Python FastAPI gateway                                   |
| **PDF/Text extraction** | Apache PDFBox (via .NET) or dedicated microservice                    |
| **Email**       | Node.js + Nodemailer (or any SMTP)                                        |
| **Container**   | Docker, Docker Compose                                                     |
| **Testing**     | Playwright (E2E), xUnit (backend – planned)                               |

---

## Prerequisites

- Docker & Docker Compose (version 2.20+)
- Git
- At least 8 GB of RAM (16 GB recommended) – the LLM can be memory‑hungry.
- (Optional) .NET 10 SDK and Node.js 20 for local development.

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/slp.git
cd slp
```

### 2. Configure Environment Variables

Copy the example environment file and adjust as needed:

```bash
cp infrastructure/.env.example infrastructure/.env
```

Edit `infrastructure/.env` to set:
- `POSTGRESQL_PORT`, `REDIS_PORT`, etc. (defaults are fine for local).
- `LLAMA_MODEL_NAME` – place your quantised GGUF model in the `infrastructure/llm/` folder and set the name (e.g., `Qwen2.5-7B-Instruct.Q4_K_M.gguf`).
- `PIPER_VOICE` – choose a voice (e.g., `en_GB-cori-medium`). Place voice files in `infrastructure/piper/`.
- `VITE_API_BACKEND_URL`, `VITE_TTS_URL`, `VITE_FILESTORAGE_URL` – these must match the host ports you expose.

### 3. Start All Services

```bash
cd infrastructure
docker-compose up -d
```

This will build and start:
- PostgreSQL
- Redis
- LLM (llama.cpp)
- Piper TTS + Gateway
- Parser service
- File storage service
- Email service
- Backend (.NET)
- Frontend (Vue)

The first start may take several minutes while Docker images are pulled and built. The LLM container will load the model into memory – this can take 1‑2 minutes and consume several GB of RAM.

### 4. Access the Application

Once all containers are healthy, open your browser at:

```
http://localhost:3002   # Frontend
```

Backend API is available at `http://localhost:3001` (Swagger UI at `/swagger`).

### 5. Create an Admin User

The first registered user automatically becomes an admin (user ID 1). Register via the frontend or use a tool like `curl`:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"securepassword","email":"admin@example.com"}'
```

Then log in with these credentials.

---

## Configuration Details

### Environment Variables (infrastructure/.env)

| Variable                  | Description                                                                 |
|---------------------------|-----------------------------------------------------------------------------|
| `POSTGRESQL_PORT`         | PostgreSQL host port (default `5433` to avoid conflict with local PG)     |
| `REDIS_PORT`              | Redis host port (default `6379`)                                            |
| `BACKEND_DOTNET_PORT`     | Backend HTTP port (default `3001`)                                          |
| `VITE_FRONTEND_PORT`      | Frontend HTTP port (default `3002`)                                         |
| `LLAMA_PORT`              | llama.cpp server port (default `3003`)                                      |
| `LLAMA_MODEL_VOLUME_PATH` | Path on host to folder containing models (e.g., `../infrastructure/llm`)   |
| `LLAMA_MODEL_NAME`        | Filename of the model inside that folder                                    |
| `PIPER_PORT`              | Host port for Piper Wyoming server (default `10200`)                        |
| `GATEWAY_PORT`            | Host port for Piper‑gateway REST API (default `3005`)                       |
| `PARSER_PORT`             | Parser service port (default `3006`)                                        |
| `FILESTORAGE_PORT`        | File storage service port (default `3007`)                                  |
| `MAIL_PORT`               | Email service port (default `3008`)                                         |
| `VITE_API_BACKEND_URL`    | URL that frontend uses to reach backend (e.g., `http://localhost:3001/api`)|
| `VITE_TTS_URL`            | URL for TTS gateway (e.g., `http://localhost:3005`)                         |
| `VITE_FILESTORAGE_URL`    | URL for file storage (e.g., `http://localhost:3007`)                        |

### Backend Settings (backend-dotnet/appsettings.json)

Override via environment variables in the `.env` file (Docker Compose passes them to the container). Key settings:

- `ConnectionStrings:Default` – PostgreSQL connection string.
- `ConnectionStrings:Redis` – Redis connection string.
- `Email:ApiEndpoint` – URL of the email microservice.
- `LlmApi:BaseUrl` – URL of the llama.cpp server.
- `TtsApi:BaseUrl` – URL of the TTS gateway.
- `ParserService:BaseUrl` – URL of the parser service.
- `FileStorage:BaseUrl` – URL of the file storage service.

---

## Usage

### User Roles

- **User**: Can create own quizzes, questions, sources, take attempts, comment, use favorites.
- **Admin**: In addition, can ban users, disable quizzes/comments, view reports, and access admin dashboard (`/admin`).

### Key Workflows

- **Create a Quiz**:
  1. From dashboard, go to “My Quizzes” → “Create Quiz”.
  2. Fill in title, description, tags, visibility.
  3. Add questions from the question bank or create new ones.
  4. Save.

- **Take a Quiz**:
  1. Open a quiz and click “Start Attempt”.
  2. Answer questions in any order; answers are auto‑saved.
  3. Submit when finished to see score and review.

- **Add a Source**:
  1. Go to “My Sources” → “Upload File” or “Add from URL” or “Add from Text”.
  2. Provide the content; backend extracts text.
  3. Read the source; select text to trigger the action bubble.

- **Generate Explanations with LLM**:
  1. While reading a source, select a phrase.
  2. Tap “Explain” in the bubble.
  3. The system checks for existing explanations; if none, it queues an LLM job.
  4. Once generated, the explanation appears (can be edited if user‑owned).

---

## Development

### Running Locally Without Docker

You can run each component separately for development.

#### Backend

```bash
cd slp/backend-dotnet
dotnet restore
dotnet run --launch-profile http
```

The backend will listen on `http://localhost:5140`. You’ll need PostgreSQL and Redis running separately (use Docker for them).

#### Frontend

```bash
cd slp/frontend-vue
npm install
npm run dev
```

The frontend will start on `http://localhost:4000` (or the port set in `.env`). It expects the backend at `http://localhost:3001/api` – you can change this in `frontend-vue/.env`.

#### LLM Server

```bash
docker run -p 3003:3003 -v /path/to/models:/models ghcr.io/ggml-org/llama.cpp:server \
  -m /models/Qwen2.5-7B-Instruct.Q4_K_M.gguf --ctx-size 4096 --host 0.0.0.0 --port 3003
```

#### TTS Gateway

```bash
cd infrastructure/piper-gateway
pip install fastapi uvicorn wyoming redis
uvicorn server:app --reload --port 3005
```

Make sure Piper is also running (e.g., via Docker).

### Testing

- **E2E Tests**: Located in `e2e_tests/`. Uses Playwright. Run with:

```bash
cd e2e_tests
npm install
npx playwright test
```

- **Backend Unit Tests**: Not yet implemented, but planned with xUnit.

### Project Structure

```
slp/
├── backend-dotnet/          # ASP.NET Core backend
├── frontend-vue/            # Vue 3 frontend
├── infrastructure/          # Docker Compose and service definitions
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── llm/                 # Place GGUF models here
│   ├── piper/               # Voice files for Piper
│   ├── piper-gateway/       # FastAPI TTS gateway
│   ├── mail/                # Simple email microservice
│   ├── parser/              # PDF/text extraction service
│   └── filestorage/         # File upload service
├── database/                 # SQL schema files
├── documents/                # Design docs (overview.md)
└── e2e_tests/               # Playwright E2E tests
```

---

## Deployment

For production, consider:

- Use a reverse proxy (like Nginx or Traefik) in front of the frontend and backend.
- Set up SSL certificates (Let’s Encrypt) for HTTPS.
- Use managed PostgreSQL/Redis or ensure proper backup strategies.
- Adjust rate limits and resource limits in Docker Compose.
- Monitor logs and set up alerts.

The application is designed to be lightweight and can run on a single VM with 4+ CPU cores and 8+ GB RAM.

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing`).
3. Commit your changes with clear messages.
4. Push to your fork and open a Pull Request.

Please ensure your code follows the existing style, includes tests where applicable, and updates documentation.

---

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

## Acknowledgements

- Built with [ASP.NET Core](https://dotnet.microsoft.com/apps/aspnet), [Vue.js](https://vuejs.org/), and [PostgreSQL](https://www.postgresql.org/).
- AI services powered by [llama.cpp](https://github.com/ggerganov/llama.cpp) and [Piper](https://github.com/rhasspy/piper).
- Icons by [Lucide](https://lucide.netlify.app/).
- UI components from [Ant Design Vue](https://www.antdv.com/).

---

**Happy Learning!** 🎓