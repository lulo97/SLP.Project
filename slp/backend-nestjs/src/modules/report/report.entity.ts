import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { QuizAttempt } from '../quiz-attempt/quiz-attempt.entity';

@Entity('report')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'target_type' })
  targetType: string;

  @Column({ name: 'target_id' })
  targetId: number;

  @Column()
  reason: string;

  @Column({ default: false })
  resolved: boolean;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: number | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'attempt_id', nullable: true })
  attemptId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver: User;

  @ManyToOne(() => QuizAttempt, { nullable: true })
  @JoinColumn({ name: 'attempt_id' })
  attempt: QuizAttempt;
}