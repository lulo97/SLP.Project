import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from './tag.entity';
import { QuizTag } from '../quiz/quiz-tag.entity';
import { Quiz } from '../quiz/quiz.entity';
import { QuestionTag } from '../question/question-tag.entity';
import { TagRepository } from './tag.repository';
import { TagService } from './tag.service';
import { TagController } from './tag.controller';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tag, QuizTag, QuestionTag, Quiz]),
    SessionModule,
  ],
  providers: [TagRepository, TagService],
  controllers: [TagController],
  exports: [TagService],
})
export class TagModule {}