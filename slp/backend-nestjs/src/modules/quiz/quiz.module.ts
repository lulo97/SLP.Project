import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QuizController } from "./quiz.controller";
import { QuizService } from "./quiz.service";
import { QuizRepository } from "./quiz.repository";
import { Quiz } from "./quiz.entity";
import { QuizQuestion } from "./quiz-question.entity";
import { QuizTag } from "./quiz-tag.entity";
import { QuizNote } from "./quiz-note.entity";
import { QuizSource } from "./quiz-source.entity";
import { TagModule } from "../tag/tag.module";
import { SourceModule } from "../source/source.module";
import { NoteModule } from "../note/note.module";
import { Note } from "../note/note.entity";
import { Source } from "../source/source.entity";
import { SessionModule } from "../session/session.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quiz,
      QuizQuestion,
      QuizTag,
      QuizNote,
      QuizSource,
      Note,
      Source,
    ]),
    TagModule,
    SourceModule,
    NoteModule,
    SessionModule,
  ],
  controllers: [QuizController],
  providers: [QuizService, QuizRepository],
  exports: [QuizService, QuizRepository],
})
export class QuizModule {}