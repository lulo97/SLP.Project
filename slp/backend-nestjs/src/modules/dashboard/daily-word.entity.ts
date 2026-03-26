import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('daily_word')
export class DailyWord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  word: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'part_of_speech' })
  partOfSpeech?: string;

  @Column({ type: 'text', nullable: true, name: 'vietnamese_translation' })
  vietnameseTranslation?: string;

  @Column({ type: 'text', nullable: true })
  example?: string;

  @Column({ type: 'text', nullable: true })
  origin?: string;

  @Column({ type: 'text', nullable: true, name: 'fun_fact' })
  funFact?: string;

  @Column({ type: 'date', name: 'target_date' })
  targetDate: Date;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}