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