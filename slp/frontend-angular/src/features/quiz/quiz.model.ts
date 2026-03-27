

export interface QuizListDto {
  id: number;
  title: string;
  description?: string;
  visibility: 'private' | 'public' | 'unlisted';
  disabled?: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  questionCount: number;
  userName?: string;
  userId?: number;
}

export interface QuizDto extends QuizListDto {
  userId: number;
}

export interface CreateQuizPayload {
  title: string;
  description?: string;
  visibility?: 'private' | 'public' | 'unlisted';
  tagNames?: string[];
}

export type UpdateQuizPayload = Partial<CreateQuizPayload>;

export interface NoteDto {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceDto {
  id: number;
  type: string;
  title: string;
  url?: string;
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

export interface QuizQuestion {
  id: number;
  quizId: number;
  originalQuestionId?: number;
  questionSnapshotJson: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}