import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { SessionMiddleware } from "./common/middleware/session.middleware";
import { RateLimitingMiddleware } from "./common/middleware/rate-limiting.middleware";
import { MetricsMiddleware } from "./common/middleware/metrics.middleware";
import { Session } from "./modules/session/session.entity";
import { User } from "./modules/user/user.entity";
import { METRICS_COLLECTOR } from "./modules/metrics/metrics.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global pipes/filters
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // tự động chuyển đổi string sang number, boolean...
      whitelist: true, // loại bỏ các thuộc tính không có trong DTO
      forbidNonWhitelisted: true, // nếu muốn chặt chẽ hơn
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Retrieve dependencies
  const configService = app.get(ConfigService);
  const metricsCollector = app.get(METRICS_COLLECTOR);
  const sessionRepository = app.get(getRepositoryToken(Session));
  const userRepository = app.get(getRepositoryToken(User)) as Repository<User>;

  // Instantiate middlewares
  const rateLimitingMiddleware = new RateLimitingMiddleware(configService);
  const metricsMiddleware = new MetricsMiddleware(metricsCollector);
  const sessionMiddleware = new SessionMiddleware(
    sessionRepository,
    userRepository,
  );

  // Register middlewares
  app.use((req, res, next) => rateLimitingMiddleware.use(req, res, next));
  app.use((req, res, next) => metricsMiddleware.use(req, res, next));
  app.use((req, res, next) => sessionMiddleware.use(req, res, next));

  // CORS
  app.enableCors({
    origin: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type, X-Session-Token",
    credentials: true,
  });

  // Swagger setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle("SLP Backend API")
    .setDescription("API documentation for the SLP learning platform")
    .setVersion("1.0")
    .addApiKey(
      { type: "apiKey", name: "X-Session-Token", in: "header" },
      "session-token",
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api", app, document);

  // ==================== DATABASE CONNECTION CHECK ====================
  const logger = new Logger("DatabaseCheck");

  try {
    // Ensure TypeORM is fully initialized
    const dataSource = app.get(DataSource);
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    // Test connection with a simple query
    const usersCount = await userRepository.count();
    logger.log(
      `✅ Database connected successfully. Users count: ${usersCount}`,
    );
  } catch (error) {
    logger.error("❌ Database connection failed or query error:");
    logger.error(error instanceof Error ? error.message : error);
    // Exit the process with error code
    process.exit(1);
  }
  // ==============================================================

  const port = process.env.PORT || 3008;
  await app.listen(port);
  Logger.log(`Application running on http://localhost:${port}`);
}
bootstrap();
