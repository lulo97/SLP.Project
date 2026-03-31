import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { DbWordOfTheDayProvider } from "./providers/db-word-of-the-day.provider";
import { QuizModule } from "../quiz/quiz.module";
import { UserModule } from "../user/user.module";
import { DailyWord } from "./daily-word.entity";

@Module({
  imports: [TypeOrmModule.forFeature([DailyWord]), QuizModule, UserModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    {
      provide: "IWordOfTheDayProvider",
      useClass: DbWordOfTheDayProvider,
    },
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
