export interface ReportDto {
  id: number;
  userId: number;
  username: string;
  targetType: 'quiz' | 'question' | 'comment';
  targetId: number;
  reason: string;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}