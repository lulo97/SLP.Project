import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "../user/user.entity";
import { QuestionTag } from "./question-tag.entity";

@Entity("question")
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ type: "varchar", length: 50, default: "multiple_choice" })
  type: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "text", nullable: true })
  explanation: string | null; // make nullable

  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadataJson: string | null; // Store JSON string

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @OneToMany(() => QuestionTag, (qt) => qt.question, { cascade: true })
  questionTags: QuestionTag[];
}
