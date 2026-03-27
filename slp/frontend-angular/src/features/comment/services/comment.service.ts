
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ApiClientService } from '../../../services/api-client.service';
import { Comment, CreateCommentRequest, UpdateCommentRequest, CommentHistoryEntry } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private commentsSubject = new BehaviorSubject<Comment[]>([]);
  public comments$ = this.commentsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private historySubject = new BehaviorSubject<CommentHistoryEntry[]>([]);
  public history$ = this.historySubject.asObservable();

  private historyLoadingSubject = new BehaviorSubject<boolean>(false);
  public historyLoading$ = this.historyLoadingSubject.asObservable();

  private currentTarget: { type: string; id: number } | null = null;

  constructor(private apiClient: ApiClientService) {}

  /**
   * Fetch comments for a specific target and store in subject.
   */
  fetchComments(targetType: string, targetId: number): void {
    this.loadingSubject.next(true);
    this.currentTarget = { type: targetType, id: targetId };
    this.apiClient.get<Comment[]>('/comments', {
      params: { targetType, targetId }
    }).subscribe({
      next: (comments) => this.commentsSubject.next(comments),
      error: () => this.commentsSubject.next([]),
      complete: () => this.loadingSubject.next(false)
    });
  }

  /**
   * Create a new comment (top-level or reply). After success, refresh comments.
   */
  createComment(request: CreateCommentRequest): Observable<Comment> {
    return this.apiClient.post<Comment>('/comments', request).pipe(
      switchMap(() => {
        // After creation, refresh the list if we have current target
        if (this.currentTarget) {
          this.fetchComments(this.currentTarget.type, this.currentTarget.id);
        }
        return of(request as unknown as Comment); // Not used but satisfy return type
      })
    );
  }

  /**
   * Update a comment. After success, refresh comments.
   */
  updateComment(commentId: number, request: UpdateCommentRequest): Observable<Comment> {
    return this.apiClient.put<Comment>(`/comments/${commentId}`, request).pipe(
      tap(() => {
        if (this.currentTarget) {
          this.fetchComments(this.currentTarget.type, this.currentTarget.id);
        }
      })
    );
  }

  /**
   * Delete a comment. After success, refresh comments.
   */
  deleteComment(commentId: number): Observable<void> {
    return this.apiClient.delete<void>(`/comments/${commentId}`).pipe(
      tap(() => {
        if (this.currentTarget) {
          this.fetchComments(this.currentTarget.type, this.currentTarget.id);
        }
      })
    );
  }

  /**
   * Fetch edit history for a comment.
   */
  fetchHistory(commentId: number): void {
    this.historyLoadingSubject.next(true);
    this.apiClient.get<CommentHistoryEntry[]>(`/comments/${commentId}/history`).subscribe({
      next: (history) => this.historySubject.next(history),
      error: () => this.historySubject.next([]),
      complete: () => this.historyLoadingSubject.next(false)
    });
  }
}