import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Note } from "../note/note.entity";
import { Quiz } from "../quiz/quiz.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ name: "password_hash" })
  passwordHash: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: "email_confirmed", default: false })
  emailConfirmed: boolean;

  @Column({ default: "user" })
  role: string;

  @Column({ default: "active" })
  status: string;

  @Column({ name: "avatar_filename", nullable: true })
  avatarFilename?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @Column({ name: "password_reset_token", nullable: true })
  passwordResetToken?: string;

  @Column({
    name: "password_reset_expiry",
    nullable: true,
    type: "timestamptz",
  })
  passwordResetExpiry?: Date;

  @Column({ name: "email_verification_token", nullable: true })
  emailVerificationToken?: string;

  @OneToMany(() => Note, (note) => note.user)
  notes: Note[];

  @OneToMany(() => Quiz, (quiz) => quiz.user)
  quizzes: Quiz[];
}
