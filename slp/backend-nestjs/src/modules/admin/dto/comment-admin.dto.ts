export class CommentAdminDto {
  id: number;
  userId: number;
  username: string;
  content: string;
  targetType: string;
  targetId: number;
  createdAt: Date;
  deletedAt?: Date;
}