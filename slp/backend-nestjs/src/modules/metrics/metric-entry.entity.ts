import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('metrics')
export class MetricEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'timestamp', type: 'timestamp' })
  timestamp: Date;

  @Column({ name: 'value', type: 'float' })
  value: number;

  @Column({ name: 'tags', type: 'jsonb', nullable: true })
  tags: any;
}