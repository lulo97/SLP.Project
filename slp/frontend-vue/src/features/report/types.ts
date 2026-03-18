export interface ReportDto {
  id: number;
  userId: number;
  username: string;
  targetType: string;
  targetId: number;
  reason: string;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}