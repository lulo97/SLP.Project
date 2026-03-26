export class QuizQuestionDto {
  id: number;
  quizId: number;
  originalQuestionId?: number | null;
  questionSnapshotJson?: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateQuizQuestionDto {
  originalQuestionId?: number;
  questionSnapshotJson?: string;
  displayOrder: number;
}

export class UpdateQuizQuestionDto {
  originalQuestionId?: number;
  questionSnapshotJson?: string;
  displayOrder?: number;
}
