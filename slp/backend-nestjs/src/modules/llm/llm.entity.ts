import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity({ name: "llm_log" })
@Index(["userId", "requestType", "prompt"])
export class LlmLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", type: "int", nullable: true })
  userId: number | null;

  @Column({ name: "request_type", type: "varchar", length: 30 })
  requestType: string;

  @Column({ type: "text" })
  prompt: string;

  @Column({ type: "text", nullable: true })
  response: string | null;

  @Column({ name: "tokens_used", type: "int", nullable: true })
  tokensUsed: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt: Date;

  @Column({ type: "varchar", name: "job_id", length: 50, nullable: true })
  jobId: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  status: string | null;

  @Column({ name: "completed_at", type: "timestamp", nullable: true })
  completedAt: Date | null;

  @Column({ type: "text", nullable: true })
  error: string | null;
}
