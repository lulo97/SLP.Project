import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Question } from "./question.entity";
import { QuestionTag } from "./question-tag.entity";
import { QuestionRepository } from "./question.repository";
import { QuestionService } from "./question.service";
import { QuestionController } from "./question.controller";
import { TagModule } from "../tag/tag.module";
import { SessionModule } from "../session/session.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Question, QuestionTag]),
    TagModule,
    SessionModule,
  ],
  providers: [QuestionRepository, QuestionService],
  controllers: [QuestionController],
  exports: [QuestionService],
})
export class QuestionModule {}
