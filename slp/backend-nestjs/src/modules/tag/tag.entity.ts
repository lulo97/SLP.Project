import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { QuizTag } from '../quiz/quiz-tag.entity';
import { QuestionTag } from '../question/question-tag.entity';

@Entity('tag')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  name: string;

  @OneToMany(() => QuizTag, (quizTag) => quizTag.tag)
  quizTags: QuizTag[];

  @OneToMany(() => QuestionTag, (questionTag) => questionTag.tag)
  questionTags: QuestionTag[];
}