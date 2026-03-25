import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryColumn,
} from "typeorm";
import { User } from "../user/user.entity";

@Entity("sessions")
export class Session {
  @PrimaryColumn("uuid") // Change from PrimaryGeneratedColumn
  id: string = crypto.randomUUID(); // Or use a library like 'uuid'
  
  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "token_hash" })
  tokenHash: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ name: "ip_address", nullable: true })
  ipAddress?: string;

  @Column({ name: "user_agent", nullable: true })
  userAgent?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user?: User;
}
