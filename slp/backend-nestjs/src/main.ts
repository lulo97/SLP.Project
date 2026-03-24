import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { SessionMiddleware } from './common/middleware/session.middleware';
import { RateLimitingMiddleware } from './common/middleware/rate-limiting.middleware';
import { MetricsMiddleware } from './common/middleware/metrics.middleware';
import { Session } from './modules/session/session.entity';
import { User } from './modules/user/user.entity';
import { METRICS_COLLECTOR } from './modules/metrics/metrics.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global pipes/filters
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Retrieve dependencies
  const configService = app.get(ConfigService);
  const metricsCollector = app.get(METRICS_COLLECTOR); // Use the interface token
  const sessionRepository = app.get(getRepositoryToken(Session));
  const userRepository = app.get(getRepositoryToken(User));

  // Instantiate middlewares
  const rateLimitingMiddleware = new RateLimitingMiddleware(configService);
  const metricsMiddleware = new MetricsMiddleware(metricsCollector);
  const sessionMiddleware = new SessionMiddleware(sessionRepository, userRepository);

  // Register middlewares
  app.use((req, res, next) => rateLimitingMiddleware.use(req, res, next));
  app.use((req, res, next) => metricsMiddleware.use(req, res, next));
  app.use((req, res, next) => sessionMiddleware.use(req, res, next));

  // CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, X-Session-Token',
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`Application running on http://localhost:${port}`);
}
bootstrap();