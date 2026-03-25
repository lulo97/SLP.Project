import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Question } from './question.entity';
import { Tag } from '../tag/tag.entity';

@Entity('question_tag')
export class QuestionTag {
  @PrimaryColumn({ name: 'question_id' })
  questionId: number;

  @PrimaryColumn({ name: 'tag_id' })
  tagId: number;

  @ManyToOne(() => Question, (q) => q.questionTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @ManyToOne(() => Tag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}