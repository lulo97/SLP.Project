import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../user/user.entity";
import { Note } from "../note/note.entity";
import { QuizQuestion } from "./quiz-question.entity";
import { QuizTag } from "./quiz-tag.entity";
import { QuizNote } from "./quiz-note.entity";
import { QuizSource } from "./quiz-source.entity";

@Entity("quiz")
export class Quiz {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @Column()
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "varchar", length: 50, default: "private" })
  visibility: string; // 'private', 'public', 'unlisted'

  @Column({ default: false })
  disabled: boolean;

  @Column({ name: "note_id", nullable: true })
  noteId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.quizzes)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Note, (note) => note.quizNotes, { nullable: true })
  @JoinColumn({ name: "note_id" })
  note: Note | null;

  @OneToMany(() => QuizQuestion, (quizQuestion) => quizQuestion.quiz, {
    cascade: true,
  })
  quizQuestions: QuizQuestion[];

  @OneToMany(() => QuizTag, (quizTag) => quizTag.quiz, { cascade: true })
  quizTags: QuizTag[];

  @OneToMany(() => QuizNote, (quizNote) => quizNote.quiz, { cascade: true })
  quizNotes: QuizNote[];

  @OneToMany(() => QuizSource, (quizSource) => quizSource.quiz, {
    cascade: true,
  })
  quizSources: QuizSource[];
}
