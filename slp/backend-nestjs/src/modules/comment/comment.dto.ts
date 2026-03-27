export class CommentDto {
  id: number;
  userId: number;
  username: string;
  parentId: number | null;
  content: string;
  createdAt: Date;
  editedAt: Date | null;
  replies: CommentDto[];
}

export class CreateCommentDto {
  parentId?: number;
  targetType: string;
  targetId: number;
  content: string;
}

export class UpdateCommentDto {
  content: string;
}

export class CommentHistoryDto {
  id: number;
  commentId: number;
  content: string;
  editedAt: Date;
}