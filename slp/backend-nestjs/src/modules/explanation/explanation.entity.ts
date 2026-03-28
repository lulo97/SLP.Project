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

@Entity({ name: 'explanation' })
export class Explanation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ name: 'source_id', type: 'int' })
  sourceId: number;

  // Stored as JSONB string, we'll keep it as a string in entity
  @Column({ name: 'text_range', type: 'jsonb', nullable: false, default: '{}' })
  textRangeJson: string;

  @Column({ type: 'text', default: '' })
  content: string;

  @Column({ name: 'author_type', type: 'varchar', length: 10, default: 'user' })
  authorType: string;

  @Column({ type: 'boolean', default: true })
  editable: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;

  // Relations
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Source, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_id' })
  source?: Source;
}