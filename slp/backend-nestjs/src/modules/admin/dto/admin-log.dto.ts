export class AdminLogDto {
  id: number;
  adminId: number;
  adminName: string;
  action: string;
  targetType?: string;
  targetId?: number;
  details?: any;
  createdAt: Date;
}