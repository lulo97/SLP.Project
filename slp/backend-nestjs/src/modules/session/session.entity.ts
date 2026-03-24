import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity('sessions')
export class Session {
  @PrimaryColumn()
  id: string; // UUID

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'token_hash' })
  tokenHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;
}