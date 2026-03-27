import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Quiz } from '../quiz/quiz.entity';
import { QuizAttemptAnswer } from './quiz-attempt-answer.entity';

@Entity('quiz_attempt')
export class QuizAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'quiz_id' })
  quizId: number;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime: Date | null;

  @Column({ type: 'int', nullable: true })
  score: number | null;

  @Column({ name: 'max_score', type: 'int' })
  maxScore: number;

  @Column({ name: 'question_count', type: 'int' })
  questionCount: number;

  @Column({ type: 'varchar', length: 20, default: 'in_progress' })
  status: string; // 'in_progress', 'completed', 'abandoned'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Quiz, { nullable: true })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @OneToMany(() => QuizAttemptAnswer, answer => answer.attempt)
  answers: QuizAttemptAnswer[];
}