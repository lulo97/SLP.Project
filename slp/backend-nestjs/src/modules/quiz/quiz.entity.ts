import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { QuizTag } from './quiz-tag.entity';

@Entity('quiz')
export class Quiz {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column()
  title: string;

  // Add other fields as needed (description, etc.)

  @OneToMany(() => QuizTag, (quizTag) => quizTag.quiz)
  quizTags: QuizTag[];
}