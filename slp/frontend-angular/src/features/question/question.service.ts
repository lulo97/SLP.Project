

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap, finalize } from 'rxjs/operators';
import { ApiClientService } from '../../services/api-client.service';
import {
  QuestionDto,
  QuestionListDto,
  CreateQuestionPayload,
  UpdateQuestionPayload,
} from './question.model';
import { PaginatedResult } from '../../utils/pagination.utils';

@Injectable({
  providedIn: 'root',
})
export class QuestionService {
  // State
  private questionsSubject = new BehaviorSubject<QuestionListDto[]>([]);
  public currentQuestionSubject = new BehaviorSubject<QuestionDto | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public errorSubject = new BehaviorSubject<string | null>(null);
  private totalSubject = new BehaviorSubject<number>(0);
  private pageSubject = new BehaviorSubject<number>(1);
  private pageSizeSubject = new BehaviorSubject<number>(10);

  // Public observables
  questions$ = this.questionsSubject.asObservable();
  currentQuestion$ = this.currentQuestionSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  total$ = this.totalSubject.asObservable();
  page$ = this.pageSubject.asObservable();
  pageSize$ = this.pageSizeSubject.asObservable();

  constructor(private apiClient: ApiClientService) {}

  fetchQuestions(params?: {
    type?: string;
    tags?: string | string[];
    search?: string;
  }, page = 1, pageSize = 10): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    let queryParams: any = { page, pageSize };
    if (params?.type) queryParams.type = params.type;
    if (params?.tags) queryParams.tags = Array.isArray(params.tags) ? params.tags.join(',') : params.tags;
    if (params?.search) queryParams.search = params.search;

    this.apiClient.get<PaginatedResult<QuestionListDto>>('/question', { params: queryParams })
      .pipe(
        tap((result) => {
          this.questionsSubject.next(result.items);
          this.totalSubject.next(result.total);
          this.pageSubject.next(result.page);
          this.pageSizeSubject.next(result.pageSize);
        }),
        catchError((err) => {
          this.errorSubject.next(err?.error?.error || 'Failed to fetch questions');
          return throwError(() => err);
        }),
        finalize(() => this.loadingSubject.next(false))
      )
      .subscribe();
  }

  fetchQuestionById(id: number): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.apiClient.get<QuestionDto>(`/question/${id}`)
      .pipe(
        tap((question) => this.currentQuestionSubject.next(question)),
        catchError((err) => {
          this.errorSubject.next(err?.error?.error || 'Failed to fetch question');
          return throwError(() => err);
        }),
        finalize(() => this.loadingSubject.next(false))
      )
      .subscribe();
  }

  createQuestion(payload: CreateQuestionPayload): Observable<QuestionDto> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient.post<QuestionDto>('/question', payload)
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        catchError((err) => {
          this.errorSubject.next(err?.error?.error || 'Failed to create question');
          this.loadingSubject.next(false);
          return throwError(() => err);
        })
      );
  }

  updateQuestion(id: number, payload: UpdateQuestionPayload): Observable<QuestionDto> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient.put<QuestionDto>(`/question/${id}`, payload)
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        catchError((err) => {
          this.errorSubject.next(err?.error?.error || 'Failed to update question');
          this.loadingSubject.next(false);
          return throwError(() => err);
        })
      );
  }

  deleteQuestion(id: number): Observable<void> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient.delete<void>(`/question/${id}`)
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        catchError((err) => {
          this.errorSubject.next(err?.error?.error || 'Failed to delete question');
          this.loadingSubject.next(false);
          return throwError(() => err);
        })
      );
  }

  clearError(): void {
    this.errorSubject.next(null);
  }
}