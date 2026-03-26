import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Quiz } from "./quiz.entity";
import { Question } from "../question/question.entity";

@Entity("quiz_question")
export class QuizQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "quiz_id" })
  quizId: number;

  @Column({ name: "original_question_id", nullable: true })
  originalQuestionId: number | null;

  @Column({ name: "question_snapshot", type: "jsonb", nullable: true })
  questionSnapshotJson: string | null;

  @Column({ name: "display_order", default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => Quiz, (quiz) => quiz.quizQuestions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "quiz_id" })
  quiz: Quiz;

  @ManyToOne(() => Question, { nullable: true })
  @JoinColumn({ name: "original_question_id" })
  originalQuestion: Question | null;
}
