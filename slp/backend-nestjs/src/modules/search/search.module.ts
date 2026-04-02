import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SessionModule } from '../session/session.module';
import { Quiz } from '../quiz/quiz.entity';
import { Question } from '../question/question.entity';
import { Source } from '../source/source.entity';
import { FavoriteItem } from '../favorite/favorite-item.entity';
import { Tag } from '../tag/tag.entity';
import { QuizTag } from '../quiz/quiz-tag.entity';
import { QuestionTag } from '../question/question-tag.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quiz, Question, Source, FavoriteItem, Tag, QuizTag, QuestionTag]),
    SessionModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}