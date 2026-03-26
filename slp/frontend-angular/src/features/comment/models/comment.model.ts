// src/features/comment/models/comment.model.ts
export interface Comment {
  id: number;
  userId: number;
  username: string;
  parentId: number | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  replies: Comment[];
}

export interface CreateCommentRequest {
  parentId?: number | null;
  targetType: string;
  targetId: number;
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentHistoryEntry {
  id: number;
  commentId: number;
  content: string;
  editedAt: string;
}