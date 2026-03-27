import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizAttemptAnswer } from './quiz-attempt-answer.entity';
import { QuizAttemptRepository } from './quiz-attempt.repository';
import { QuizAttemptService } from './quiz-attempt.service';
import { QuizAttemptController } from './quiz-attempt.controller';
import { QuizModule } from '../quiz/quiz.module'; // Assuming QuizModule exists
import { SessionModule } from "../session/session.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([QuizAttempt, QuizAttemptAnswer]),
    QuizModule, // Provides IQuizRepository
    SessionModule
  ],
  providers: [
    QuizAttemptRepository,
    {
      provide: 'IQuizAttemptRepository',
      useClass: QuizAttemptRepository,
    },
    QuizAttemptService,
    {
      provide: 'IQuizAttemptService',
      useClass: QuizAttemptService,
    },
  ],
  controllers: [QuizAttemptController],
  exports: ['IQuizAttemptService'], // For other modules that need it (e.g., Report)
})
export class QuizAttemptModule {}