Below is a detailed project file structure for the **SLP (Self Learning Platform)** based on the provided design. The structure is organized to support a service‑oriented architecture with a .NET backend, a modern frontend, multiple microservices, and all required infrastructure components. All paths are relative to the project root (`SLP/`).

```
SLP/
├── backend/                      # Main backend API (ASP.NET Core)
│   ├── Controllers/               # REST endpoints
│   │   ├── AuthController.cs
│   │   ├── UsersController.cs
│   │   ├── QuizzesController.cs
│   │   ├── QuestionsController.cs
│   │   ├── SourcesController.cs
│   │   ├── AttemptsController.cs
│   │   ├── CommentsController.cs
│   │   ├── FavoritesController.cs
│   │   ├── SearchController.cs
│   │   ├── LLMController.cs       # Queues LLM jobs
│   │   ├── AdminController.cs
│   │   └── ...
│   ├── Models/                    # Entity classes & DTOs
│   │   ├── Entities/               # Database models (User, Quiz, Source, etc.)
│   │   ├── DTOs/                   # Request/response objects
│   │   └── Enums/
│   ├── Data/                       # Database context & migrations
│   │   ├── AppDbContext.cs
│   │   ├── Migrations/
│   │   └── Repositories/           # Optional repository layer
│   ├── Services/                    # Business logic & external integrations
│   │   ├── AuthService.cs
│   │   ├── QuizService.cs
│   │   ├── SourceService.cs
│   │   ├── LLMQueueService.cs       # Publishes
│   │   ├── TTSQueueService.cs
│   │   ├── EmailService.cs          # Sends emails via SMTP/HTTP
│   │   ├── RateLimitService.cs      # Redis counters
│   │   ├── HtmlSanitizerService.cs
│   │   └── ...
│   ├── Middleware/                  # Custom middleware
│   │   ├── RateLimitingMiddleware.cs
│   │   ├── SessionMiddleware.cs
│   │   └── ErrorHandlingMiddleware.cs
│   ├── Config/                       # Configuration classes
│   │   ├── RedisSettings.cs
│   │   ├── LlmSettings.cs
│   │   └── ...
│   ├── Program.cs
│   ├── Startup.cs
│   ├── appsettings.json              # Base config
│   ├── appsettings.Development.json
│   └── SLP.Backend.csproj
│
├── frontend/                         # Single‑page application (React / Vue)
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── assets/                   # Images, fonts, etc.
│   │   ├── components/                # Reusable UI components
│   │   │   ├── QuizPlayer/
│   │   │   ├── TextSelectionBubble/
│   │   │   ├── AdminDashboard/
│   │   │   └── ...
│   │   ├── pages/                     # Route‑level components
│   │   │   ├── Home/
│   │   │   ├── Quiz/
│   │   │   ├── Reading/
│   │   │   ├── Favorites/
│   │   │   ├── Admin/
│   │   │   └── ...
│   │   ├── services/                  # API clients
│   │   │   ├── api.js                 # Axios instance
│   │   │   ├── auth.js
│   │   │   ├── quizzes.js
│   │   │   ├── sources.js
│   │   │   └── ...
│   │   ├── store/                      # State management (Vuex / Redux)
│   │   ├── styles/                      # Global styles
│   │   ├── App.js / App.vue
│   │   └── index.js / main.js
│   ├── package.json
│   ├── vite.config.js / vue.config.js
│   └── ...
│
├── microservices/                      # Independent auxiliary services
│   ├── pdf-extractor/                  # Java (Apache PDFBox)
│   │   ├── src/
│   │   │   ├── main/java/.../ExtractorApplication.java
│   │   │   └── ...
│   │   ├── pom.xml
│   │   └── Dockerfile
│   ├── llm-service/                     # Python (llama.cpp)
│   │   ├── app/
│   │   │   ├── main.py                  # FastAPI / Flask
│   │   │   ├── consumer.py               # consumer
│   │   │   ├── llama_wrapper.py
│   │   │   └── ...
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── models/                       # Mistral 7B weights (git‑ignored)
│   ├── tts-service/                      # Python (Piper)
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── consumer.py
│   │   │   └── ...
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── voices/                        # Piper voice files (git‑ignored)
│   └── email-service/                     # Node.js / Python SMTP handler
│       ├── app/
│       │   ├── server.js / main.py
│       │   └── ...
│       ├── package.json / requirements.txt
│       └── Dockerfile
│
├── infrastructure/                      # Docker & configuration
│   ├── docker-compose.yml                # Orchestrates all services
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── ssl/                          # SSL certificates (dev only)
│   ├── postgres/
│   │   ├── init/                          # Initialisation scripts
│   │   │   └── 01-schema.sql
│   │   └── my.cnf
│   ├── redis/
│   │   └── redis.conf
│
├── storage/                               # File storage (mounted volume)
│   ├── uploads/                            # Original PDF/TXT files
│   │   └── [year]/[month]/...
│   └── backups/                             # Daily DB & file backups
│
├── scripts/                                # Utility scripts
│   ├── backup.sh                            # Daily backup
│   ├── deploy.sh                             # Deployment script
│   ├── seed-data.sql                          # Test data
│   └── ...
│
├── .env.example                             # Environment variables template
├── .gitignore
├── README.md                                # Project overview & setup
└── LICENSE
```

## Key Files Explained

### Backend (ASP.NET Core)
- **Controllers/**: Map to the API endpoints listed in §16.6. Each controller handles HTTP requests, validates input, and calls appropriate services.
- **Models/Entities/**: Plain C# classes representing database tables (`User`, `Quiz`, `Source`, etc.). Entity Framework Core uses these for migrations.
- **Models/DTOs/**: Data transfer objects for requests/responses (e.g., `CreateQuizRequest`, `QuizResponse`). Ensures API contracts are decoupled from internal models.
- **Data/AppDbContext.cs**: EF Core database context. Configures tables, relationships, indexes (including GIN for full‑text search).
- **Services/**: Encapsulate business logic:
  - `AuthService`: Registration, login, password hashing (Argon2id), session management.
  - `QuizService`: CRUD for quizzes, cloning questions, handling attempts (snapshots).
  - `SourceService`: File upload, text extraction (calls PDF‑extractor microservice), reading progress.
  - `LLMQueueService`: Publishes requests `llm_requests` topic.
  - `RateLimitService`: Uses Redis to enforce per‑IP limits.
- **Middleware/**: Custom pipeline components for rate limiting, session validation, and global error handling.
- **Config/**: Strongly typed settings, Redis, LLM endpoints, etc., bound from `appsettings.json`.
- **Program.cs / Startup.cs**: Application entry point; configures services, middleware, and endpoints.

### Frontend (React / Vue)
- **src/components/**: Reusable UI pieces like `QuizPlayer` (navigates questions, auto‑save), `TextSelectionBubble` (floating menu on text selection), `AdminDashboard` (tables with actions).
- **src/pages/**: Top‑level views for routes (e.g., `/quiz/:id`, `/source/:id`, `/admin/users`).
- **src/services/**: API client modules using Axios/Fetch. Each module exports functions that call backend endpoints.
- **src/store/**: Global state (authentication, current quiz attempt, UI theme). Could use Vuex, Redux, or Context API.
- **public/index.html**: Entry HTML with mobile‑viewport meta tags.

### Microservices
- **pdf-extractor/**: Java Spring Boot (or simple servlet) that receives a file, extracts text via Apache PDFBox, and returns plain text. Synchronous HTTP.
- **llm-service/**: Python FastAPI app with a consumer. Listens to `llm_requests`, calls llama.cpp (subprocess or C library), stores result in DB via backend API (or directly if shared DB access is allowed). Returns job ID for polling.
- **tts-service/**: Similar to LLM service, but generates audio using Piper CLI. Audio may be saved to a public folder and URL returned.
- **email-service/**: Lightweight SMTP sender. Consumes `email_requests` topic and sends emails via a configured SMTP relay (e.g., Postal, Mailcow, or direct SMTP).

### Infrastructure
- **docker-compose.yml**: Defines all containers (backend, frontend, postgres, redis, each microservice). Networks and volumes are set up.
- **nginx/**: Reverse proxy configuration to serve frontend static files and route `/api` to backend. Also handles SSL termination if needed.
- **postgres/init/**: SQL scripts to create tables, indexes, and full‑text search configuration on first run.

### Storage
- **uploads/**: Retains original uploaded PDF/TXT files. Subdirectories by date to avoid too many files in one folder.
- **backups/**: Daily dumps (PostgreSQL `pg_dump`) and archived copies of `uploads/`, retained for 30 days (handled by backup script).

### Scripts
- **backup.sh**: Runs via cron; creates timestamped dump and tarball, then cleans up old backups.
- **deploy.sh**: Pulls latest code, rebuilds containers, runs migrations, and restarts services.
- **seed-data.sql**: Populates development database with sample users, quizzes, and sources.

## Additional Notes
- **Environment variables**: Sensitive values (DB passwords, API keys) are stored in `.env` (not committed) and referenced in `docker-compose.yml` and `appsettings.json`.
- **Rate limiting**: Implemented in backend middleware using Redis counters; limits defined in `appsettings.json`.
- **Full‑text search**: PostgreSQL GIN indexes on `quizzes.title`, `quizzes.description`, `sources.text`, etc. Use `websearch_to_tsquery` for simple syntax.
- **Session store**: Redis with 7‑day TTL; cookie contains only session ID (HTTP‑only, Secure, SameSite=Strict).
- **HTML sanitization**: Use a library like `HtmlSanitizer` (C#) or a dedicated microservice; allowed tags and attributes as per §16.4.
- **Quiz attempt snapshots**: When an attempt starts, backend copies question data into `quiz_attempt_answer.question_snapshot` (JSON). This ensures historical accuracy.

This structure provides a clear separation of concerns, supports independent development of microservices, and simplifies deployment via Docker Compose. All components can run on a single laptop while remaining modular enough for future scaling.