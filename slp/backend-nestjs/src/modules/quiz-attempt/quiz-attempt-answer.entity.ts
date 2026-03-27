import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizQuestion } from '../quiz/quiz-question.entity';

@Entity('quiz_attempt_answer')
export class QuizAttemptAnswer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'attempt_id' })
  attemptId: number;

  @Column({ name: 'quiz_question_id' })
  quizQuestionId: number;

  @Column({ name: 'question_snapshot', type: 'jsonb' })
  questionSnapshotJson: string;

  @Column({ name: 'answer_json', type: 'jsonb', default: '{}' })
  answerJson: string;

  @Column({ name: 'is_correct', type: 'boolean', nullable: true })
  isCorrect: boolean | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => QuizAttempt, attempt => attempt.answers)
  @JoinColumn({ name: 'attempt_id' })
  attempt: QuizAttempt;

  @ManyToOne(() => QuizQuestion, { nullable: true })
  @JoinColumn({ name: 'quiz_question_id' })
  quizQuestion: QuizQuestion;
}