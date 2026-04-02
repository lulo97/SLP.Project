export default () => ({
  port: Number(process.env.PORT) || 3008,
  database: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:123@localhost:5433/postgres",
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  email: {
    baseUrl: process.env.EMAIL_BASE_URL || "http://localhost:3000",
    apiEndpoint:
      process.env.EMAIL_API_ENDPOINT || "http://localhost:3000/send-email",
    fromEmail: process.env.EMAIL_FROM_EMAIL || "noreply@yourapp.com",
    fromName: process.env.EMAIL_FROM_NAME || "SLP",
    throwOnError: process.env.EMAIL_THROW_ON_ERROR === "true" || false,
  },
  llmApi: {
    baseUrl:
      process.env.LLM_API_BASE_URL ||
      "http://localhost:3003/v1/chat/completions",
  },
  llmCache: {
    enabled: process.env.LLM_CACHE_ENABLED === "true" || false,
  },
  queue: {
    enabled: process.env.QUEUE_ENABLED === "true" || true,
    maxRetries: Number(process.env.QUEUE_MAX_RETRIES) || 3,
  },
  parserService: {
    baseUrl: process.env.PARSER_SERVICE_BASE_URL || "http://localhost:3006",
  },
  fileStorage: {
    baseUrl:
      process.env.FILE_STORAGE_BASE_URL || "http://filestorage-container:3007",
    apiKey: process.env.FILE_STORAGE_API_KEY || "",
  },
  ttsApi: {
    baseUrl: process.env.TTS_API_BASE_URL || "http://localhost:3005",
  },
  frontend: {
    baseUrl: process.env.FRONTEND_BASE_URL || "http://localhost:3002",
    baseUrlForEmail:
      process.env.FRONTEND_BASE_URL_FOR_EMAIL || "http://localhost:3002",
  },
});
