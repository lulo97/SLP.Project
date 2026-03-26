import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { Quiz } from "./quiz.entity";
import { Source } from "../source/source.entity";

@Entity("quiz_source")
export class QuizSource {
  @PrimaryColumn({ name: "quiz_id" })
  quizId: number;

  @PrimaryColumn({ name: "source_id" })
  sourceId: number;

  @ManyToOne(() => Quiz, (quiz) => quiz.quizSources, { onDelete: "CASCADE" })
  @JoinColumn({ name: "quiz_id" })
  quiz: Quiz;

  @ManyToOne(() => Source, (source) => source.quizSources, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "source_id" })
  source: Source;
}
