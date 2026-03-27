import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../services/api-client.service';
import { ReportDto } from './report.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(private apiClient: ApiClientService) {}

  getMyReports(): Observable<ReportDto[]> {
    return this.apiClient.get<ReportDto[]>('/reports/mine');
  }

  createReport(payload: {
    targetType: string;
    targetId: number;
    reason: string;
    attemptId?: number;
  }): Observable<ReportDto> {
    return this.apiClient.post<ReportDto>('/reports', payload);
  }

  deleteMyReport(id: number): Observable<void> {
    return this.apiClient.delete<void>(`/reports/mine/${id}`);
  }

  // Admin endpoints
  getUnresolvedReports(): Observable<ReportDto[]> {
    return this.apiClient.get<ReportDto[]>('/reports'); // backend returns unresolved by default
  }

  resolveReport(id: number): Observable<void> {
    return this.apiClient.post<void>(`/reports/${id}/resolve`, {});
  }

  deleteComment(commentId: number): Observable<void> {
    return this.apiClient.delete<void>(`/admin/comments/${commentId}`);
  }

  disableQuiz(quizId: number): Observable<void> {
    return this.apiClient.post<void>(`/admin/quizzes/${quizId}/disable`, {});
  }
}