import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "../modules/auth/auth.module";
import { UserModule } from "../modules/user/user.module";
import { SessionModule } from "../modules/session/session.module";
import { MetricsModule } from "../modules/metrics/metrics.module";
import configuration from "../config/configuration";
// import { QuizModule } from './modules/quiz/quiz.module';
// import { SourceModule } from './modules/source/source.module';
// import { NoteModule } from './modules/note/note.module';
// import { ExplanationModule } from './modules/explanation/explanation.module';
// import { ProgressModule } from './modules/progress/progress.module';
// import { FavoriteModule } from './modules/favorite/favorite.module';
// import { CommentModule } from './modules/comment/comment.module';
// import { ReportModule } from './modules/report/report.module';
// import { AdminModule } from './modules/admin/admin.module';
// import { DashboardModule } from './modules/dashboard/dashboard.module';
// import { HealthModule } from './modules/health/health.module';
// import { LlmModule } from './modules/llm/llm.module';
// import { QueueModule } from './modules/queue/queue.module';
import { EmailModule } from "../modules/email/email.module";
// import { FileStorageModule } from './modules/file-storage/file-storage.module';
// import { SearchModule } from './modules/search/search.module';
// import { QuizAttemptModule } from './modules/quiz-attempt/quiz-attempt.module';
// import { DailyWordModule } from './modules/daily-word/daily-word.module';
import { TagModule } from "../modules/tag/tag.module";
import { QuestionModule } from "../modules/question/question.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false, // use migrations
      logging: true,
    }),
    AuthModule,
    UserModule,
    SessionModule,
    // QuizModule,
    // SourceModule,
    // NoteModule,
    // ExplanationModule,
    // ProgressModule,
    // FavoriteModule,
    // CommentModule,
    // ReportModule,
    // AdminModule,
    // DashboardModule,
    // HealthModule,
    // LlmModule,
    // QueueModule,
    EmailModule,
    // FileStorageModule,
    MetricsModule,

    TagModule,
    QuestionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
