import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Source } from '../source/source.entity';

@Entity({ name: 'user_source_progress' })
export class UserSourceProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'source_id', type: 'int' })
  sourceId: number;

  // Store as JSONB; TypeORM will automatically parse/serialize
  @Column({ name: 'last_position', type: 'jsonb', nullable: true })
  lastPosition: any;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Relations (optional but helpful for queries)
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Source, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_id' })
  source?: Source;
}