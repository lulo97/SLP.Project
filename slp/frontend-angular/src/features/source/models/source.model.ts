export interface Source {
  id: number;
  userId: number;
  type: 'pdf' | 'link' | 'text';
  title: string;
  url?: string;
  rawText?: string;
  contentJson?: any;
  filePath?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

export interface SourceListItem {
  id: number;
  type: string;
  title: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SourceQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
}

export interface SourceDetail extends Source {
  rawText?: string;
  contentJson?: any;
  metadata?: any;
}

export interface ProgressDto {
  sourceId: number;
  lastPosition: {
    scrollPosition?: number;
    percentComplete?: number;
  } | null;
  updatedAt: string;
}

export interface UpdateProgressRequest {
  lastPosition: {
    scrollPosition: number;
    percentComplete: number;
  };
}

export interface ExplanationItem {
  id: number;
  userId?: number;
  sourceId?: number;
  textRange?: { text?: string; [key: string]: any } | null;
  content: string;
  authorType?: string;
  editable?: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface FavoriteRequest {
  text: string;
  type: 'word' | 'phrase' | 'idiom' | 'other';
  note?: string;
}