import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Report } from "./report.entity";
import { ReportRepository } from "./report.repository";
import { ReportService } from "./report.service";
import { ReportController } from "./report.controller";
import { AdminModule } from "../admin/admin.module";
import { QuizAttempt } from "../quiz-attempt/quiz-attempt.entity";
import { SessionModule } from "../session/session.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, QuizAttempt]),
    AdminModule,
    SessionModule,
  ],
  providers: [
    ReportRepository,
    {
      provide: "IReportRepository",
      useClass: ReportRepository,
    },
    ReportService,
    {
      provide: "IReportService",
      useClass: ReportService,
    },
  ],
  controllers: [ReportController],
  exports: ["IReportService"],
})
export class ReportModule {}
