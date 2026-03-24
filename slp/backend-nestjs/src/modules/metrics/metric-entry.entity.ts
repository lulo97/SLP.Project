import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('metrics')
export class MetricEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  name: string;

  @Column({ type: 'timestamptz' })
  @Index()
  timestamp: Date;

  @Column('double precision')
  value: number;

  @Column({ nullable: true })
  tags?: string;
}