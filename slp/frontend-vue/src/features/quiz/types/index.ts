export interface QuizQuestion {
  id: number;
  quizId: number;
  originalQuestionId?: number;
  questionSnapshotJson: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DisplayQuestion {
  id: number;
  content: string;
  type: string;
  explanation?: string;
  metadata: any;
  tags: string[];
  displayOrder: number;
  questionSnapshotJson: string;
}