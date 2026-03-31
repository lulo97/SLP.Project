import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiClientService } from "../../services/api-client.service";
import { ReportDto } from "./report.model";
import { HttpParams } from "@angular/common/http";
import { PaginatedResult } from "../../utils/pagination.utils";

@Injectable({ providedIn: "root" })
export class ReportService {
  constructor(private apiClient: ApiClientService) {}

  getMyReports(): Observable<ReportDto[]> {
    return this.apiClient.get<ReportDto[]>("/reports/mine");
  }

  createReport(payload: {
    targetType: string;
    targetId: number;
    reason: string;
    attemptId?: number;
  }): Observable<ReportDto> {
    return this.apiClient.post<ReportDto>("/reports", payload);
  }

  deleteMyReport(id: number): Observable<void> {
    return this.apiClient.delete<void>(`/reports/mine/${id}`);
  }

  // Admin endpoints with pagination
  getUnresolvedReports(
    search?: string,
    page = 1,
    pageSize = 20,
  ): Observable<PaginatedResult<ReportDto>> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("pageSize", pageSize.toString());
    if (search) {
      params = params.set("search", search);
    }
    return this.apiClient.get<PaginatedResult<ReportDto>>("/reports", {
      params,
    });
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
