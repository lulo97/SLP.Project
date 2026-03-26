import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { User } from "../user/user.entity";
import { QuizNote } from "../quiz/quiz-note.entity";

@Entity("note")
export class Note {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column({
    name: "created_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date;

  @Column({
    name: "updated_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt: Date;

  // Optional relation to User (if needed)
  @ManyToOne(() => User, (user) => user.notes)
  @JoinColumn({ name: "user_id" })
  user: User;

  @OneToMany(() => QuizNote, (quizNote) => quizNote.note)
  quizNotes: QuizNote[];
}
