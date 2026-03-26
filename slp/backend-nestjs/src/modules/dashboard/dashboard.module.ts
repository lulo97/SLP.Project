import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { DailyWord } from "./daily-word.entity";
import {
  DbWordOfTheDayProvider,
  WORD_OF_THE_DAY_PROVIDER,
} from "./providers/word-of-the-day.provider";
import { QuizModule } from "../quiz/quiz.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [TypeOrmModule.forFeature([DailyWord]), QuizModule, UserModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    {
      provide: WORD_OF_THE_DAY_PROVIDER,
      useClass: DbWordOfTheDayProvider, // or StaticWordOfTheDayProvider
    },
  ],
})
export class DashboardModule {}
