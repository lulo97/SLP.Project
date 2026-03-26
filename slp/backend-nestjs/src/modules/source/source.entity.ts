import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { User } from "../user/user.entity";
import { QuizSource } from "../quiz/quiz-source.entity";

@Entity("source")
export class Source {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ type: "varchar", length: 50, default: "text" })
  type: string;

  @Column({ type: "varchar", length: 255, default: "" })
  title: string;

  @Column({ type: "varchar", nullable: true })
  url: string | null;

  @Column({ name: "content", type: "jsonb", nullable: true })
  contentJson: string | null;

  @Column({ name: "raw_html", type: "text", nullable: true })
  rawHtml: string | null;

  @Column({ name: "raw_text", type: "text", nullable: true })
  rawText: string | null;

  @Column({ name: "file_path", type: "varchar", nullable: true })
  filePath: string | null;

  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadataJson: string | null;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @OneToMany(() => QuizSource, (quizSource) => quizSource.source)
  quizSources: QuizSource[];
}
