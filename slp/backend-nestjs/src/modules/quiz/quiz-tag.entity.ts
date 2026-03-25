import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Quiz } from './quiz.entity';
import { Tag } from '../tag/tag.entity';

@Entity('quiz_tag')
export class QuizTag {
  @PrimaryColumn({ name: 'quiz_id' })
  quizId: number;

  @PrimaryColumn({ name: 'tag_id' })
  tagId: number;

  @ManyToOne(() => Quiz, (quiz) => quiz.quizTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @ManyToOne(() => Tag, (tag) => tag.quizTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}