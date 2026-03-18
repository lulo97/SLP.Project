import apiClient from '@/lib/api/client';
import type { ReportDto } from '../types';

export const reportApi = {
  getMyReports(): Promise<ReportDto[]> {
    return apiClient.get<ReportDto[]>('/reports/mine').then(r => r.data);
  },

  createReport(payload: {
    targetType: string;
    targetId: number;
    reason: string;
  }): Promise<ReportDto> {
    return apiClient.post<ReportDto>('/reports', payload).then(r => r.data);
  },

  deleteMyReport(id: number): Promise<void> {
    return apiClient.delete(`/reports/mine/${id}`).then(() => undefined);
  },
};