export class QuizDto {
  id: number;
  userId: number;
  title: string;
  description?: string | null;
  visibility: string;
  disabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  questionCount: number;
  userName?: string;
}

export class QuizListDto {
  id: number;
  title: string;
  description?: string | null;
  userId: number;
  visibility: string;
  disabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  questionCount: number;
  userName?: string;
}
