import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { Quiz } from "./quiz.entity";
import { Note } from "../note/note.entity";

@Entity("quiz_note")
export class QuizNote {
  @PrimaryColumn({ name: "quiz_id" })
  quizId: number;

  @PrimaryColumn({ name: "note_id" })
  noteId: number;

  @ManyToOne(() => Quiz, (quiz) => quiz.quizNotes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "quiz_id" })
  quiz: Quiz;

  @ManyToOne(() => Note, { onDelete: "CASCADE" })
  @JoinColumn({ name: "note_id" })
  note: Note;
}
