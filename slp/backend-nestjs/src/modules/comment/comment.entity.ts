import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
  DeleteDateColumn,
} from "typeorm";
import { User } from "../user/user.entity";

@Entity("comment")
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "parent_id", nullable: true })
  parentId: number | null;

  @Column({ name: "target_type" })
  targetType: string; // 'quiz', 'source', 'question'

  @Column({ name: "target_id" })
  targetId: number;

  @Column({ type: "text" })
  content: string;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt?: Date | null;

  @Column({
    name: "edited_at",
    type: "timestamptz",
    nullable: true,
  })
  editedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Comment, (comment) => comment.replies)
  @JoinColumn({ name: "parent_id" })
  parent: Comment;

  @OneToMany(() => Comment, (comment) => comment.parent)
  replies: Comment[];
}
