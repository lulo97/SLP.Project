

export interface QuestionDto {
  id: number;
  userId: number;
  type: string;
  content: string;
  explanation?: string | null;
  metadataJson?: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  userName?: string | null;
}

export interface QuestionListDto {
  id: number;
  type: string;
  content: string;
  explanation?: string | null;
  metadataJson?: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  userName?: string | null;
}

export interface CreateQuestionPayload {
  type: string;
  content: string;
  explanation?: string;
  metadataJson?: string;
  tagNames?: string[];
}

export type UpdateQuestionPayload = Partial<CreateQuestionPayload>;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}