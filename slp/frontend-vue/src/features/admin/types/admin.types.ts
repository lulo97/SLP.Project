export interface UserDto {
  id: number;
  username: string;
  email: string | null;
  emailConfirmed: boolean;
  role: string;
  status: string;
  createdAt: string;
}

export interface QuizAdminDto {
  id: number;
  title: string;
  userId: number;
  username: string;
  visibility: string;
  disabled: boolean;
  createdAt: string;
}

export interface CommentAdminDto {
  id: number;
  userId: number;
  username: string;
  content: string;
  targetType: string;
  targetId: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface AdminLogDto {
  id: number;
  adminId: number;
  adminName: string;
  action: string;
  targetType: string | null;
  targetId: number | null;
  details?: any;
  createdAt: string;
}