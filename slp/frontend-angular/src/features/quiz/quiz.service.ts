

import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, throwError } from "rxjs";
import { catchError, tap, finalize } from "rxjs/operators";
import { ApiClientService } from "../../services/api-client.service";
import {
  QuizListDto,
  QuizDto,
  CreateQuizPayload,
  UpdateQuizPayload,
  NoteDto,
  SourceDto,
  QuizQuestion,
  PaginatedResult,
} from "./quiz.model";

@Injectable({ providedIn: "root" })
export class QuizService {
  // Quiz list state
  private quizzesSubject = new BehaviorSubject<QuizListDto[]>([]);
  public quizzes$ = this.quizzesSubject.asObservable();

  private currentQuizSubject = new BehaviorSubject<QuizDto | null>(null);
  public currentQuiz$ = this.currentQuizSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  // Pagination for list
  private totalSubject = new BehaviorSubject<number>(0);
  public total$ = this.totalSubject.asObservable();

  public pageSubject = new BehaviorSubject<number>(1);
  public page$ = this.pageSubject.asObservable();

  private pageSizeSubject = new BehaviorSubject<number>(10);
  public pageSize$ = this.pageSizeSubject.asObservable();

  // Notes for a quiz
  private notesSubject = new BehaviorSubject<NoteDto[]>([]);
  public notes$ = this.notesSubject.asObservable();
  private notesLoadingSubject = new BehaviorSubject<boolean>(false);
  public notesLoading$ = this.notesLoadingSubject.asObservable();

  // Sources for a quiz
  private sourcesSubject = new BehaviorSubject<SourceDto[]>([]);
  public sources$ = this.sourcesSubject.asObservable();
  private sourcesLoadingSubject = new BehaviorSubject<boolean>(false);
  public sourcesLoading$ = this.sourcesLoadingSubject.asObservable();

  constructor(private apiClient: ApiClientService) {}

  // ─── Quiz list / CRUD ─────────────────────────────────────────────────

  fetchMyQuizzes(page = 1, pageSize = 10): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.pageSubject.next(page);
    this.pageSizeSubject.next(pageSize);
    this.apiClient
      .get<PaginatedResult<QuizListDto>>(
        `/quiz?mine=true&page=${page}&pageSize=${pageSize}`,
      )
      .pipe(
        tap((result) => {
          this.quizzesSubject.next(result.items);
          this.totalSubject.next(result.total);
        }),
        catchError((err) => {
          this.errorSubject.next(
            err?.error?.error || "Failed to fetch your quizzes",
          );
          return throwError(() => err);
        }),
        finalize(() => this.loadingSubject.next(false)),
      )
      .subscribe();
  }

  fetchPublicQuizzes(page = 1, pageSize = 10): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.pageSubject.next(page);
    this.pageSizeSubject.next(pageSize);
    this.apiClient
      .get<PaginatedResult<QuizListDto>>(
        `/quiz?page=${page}&pageSize=${pageSize}&visibility=public`,
      )
      .pipe(
        tap((result) => {
          this.quizzesSubject.next(result.items);
          this.totalSubject.next(result.total);
        }),
        catchError((err) => {
          this.errorSubject.next(
            err?.error?.error || "Failed to fetch public quizzes",
          );
          return throwError(() => err);
        }),
        finalize(() => this.loadingSubject.next(false)),
      )
      .subscribe();
  }

  searchQuizzes(searchTerm: string, page = 1, pageSize = 10): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.pageSubject.next(page);
    this.pageSizeSubject.next(pageSize);
    this.apiClient
      .get<PaginatedResult<QuizListDto>>(
        `/quiz?search=${encodeURIComponent(searchTerm)}&page=${page}&pageSize=${pageSize}`,
      )
      .pipe(
        tap((result) => {
          this.quizzesSubject.next(result.items);
          this.totalSubject.next(result.total);
        }),
        catchError((err) => {
          this.errorSubject.next(err?.error?.error || "Search failed");
          return throwError(() => err);
        }),
        finalize(() => this.loadingSubject.next(false)),
      )
      .subscribe();
  }

  fetchQuizById(id: number): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.apiClient
      .get<QuizDto>(`/quiz/${id}`)
      .pipe(
        tap((quiz) => this.currentQuizSubject.next(quiz)),
        catchError((err) => {
          this.errorSubject.next(err?.error?.error || "Failed to fetch quiz");
          return throwError(() => err);
        }),
        finalize(() => this.loadingSubject.next(false)),
      )
      .subscribe();
  }

  createQuiz(payload: CreateQuizPayload): Observable<QuizDto> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient.post<QuizDto>("/quiz", payload).pipe(
      finalize(() => this.loadingSubject.next(false)),
      catchError((err) => {
        this.errorSubject.next(err?.error?.error || "Failed to create quiz");
        return throwError(() => err);
      }),
    );
  }

  updateQuiz(id: number, payload: UpdateQuizPayload): Observable<QuizDto> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient.put<QuizDto>(`/quiz/${id}`, payload).pipe(
      finalize(() => this.loadingSubject.next(false)),
      catchError((err) => {
        this.errorSubject.next(err?.error?.error || "Failed to update quiz");
        return throwError(() => err);
      }),
    );
  }

  deleteQuiz(id: number): Observable<void> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient.delete<void>(`/quiz/${id}`).pipe(
      finalize(() => this.loadingSubject.next(false)),
      catchError((err) => {
        this.errorSubject.next(err?.error?.error || "Failed to delete quiz");
        return throwError(() => err);
      }),
    );
  }

  duplicateQuiz(id: number): Observable<QuizDto> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    // Added {} as the second argument (the body)
    return this.apiClient.post<QuizDto>(`/quiz/${id}/duplicate`, {}).pipe(
      finalize(() => this.loadingSubject.next(false)),
      catchError((err) => {
        this.errorSubject.next(err?.error?.error || "Failed to duplicate quiz");
        return throwError(() => err);
      }),
    );
  }

  // ─── Quiz questions ─────────────────────────────────────────────────

  fetchQuizQuestions(quizId: number): Observable<QuizQuestion[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient.get<QuizQuestion[]>(`/quiz/${quizId}/questions`).pipe(
      finalize(() => this.loadingSubject.next(false)),
      catchError((err) => {
        this.errorSubject.next(
          err?.error?.error || "Failed to fetch questions",
        );
        return throwError(() => err);
      }),
    );
  }

  createQuizQuestion(
    quizId: number,
    snapshotJson: string,
    displayOrder: number,
    originalQuestionId?: number,
  ): Observable<QuizQuestion> {
    return this.apiClient.post<QuizQuestion>(`/quiz/${quizId}/questions`, {
      questionSnapshotJson: snapshotJson,
      displayOrder,
      originalQuestionId,
    });
  }

  updateQuizQuestion(
    questionId: number,
    snapshotJson: string,
    displayOrder: number,
  ): Observable<QuizQuestion> {
    return this.apiClient.put<QuizQuestion>(`/quiz/questions/${questionId}`, {
      questionSnapshotJson: snapshotJson,
      displayOrder,
    });
  }

  deleteQuizQuestion(questionId: number): Observable<void> {
    return this.apiClient.delete<void>(`/quiz/questions/${questionId}`);
  }

  // ─── Notes ─────────────────────────────────────────────────

  fetchQuizNotes(quizId: number): void {
    this.notesLoadingSubject.next(true);
    this.apiClient
      .get<NoteDto[]>(`/quiz/${quizId}/notes`)
      .pipe(
        tap((notes) => this.notesSubject.next(notes)),
        catchError((err) => {
          this.errorSubject.next(err?.error?.error || "Failed to fetch notes");
          return throwError(() => err);
        }),
        finalize(() => this.notesLoadingSubject.next(false)),
      )
      .subscribe();
  }

  addNoteToQuiz(
    quizId: number,
    payload: { title: string; content: string },
  ): Observable<NoteDto> {
    return this.apiClient.post<NoteDto>(`/quiz/${quizId}/notes`, payload).pipe(
      tap((newNote) => {
        const current = this.notesSubject.value;
        this.notesSubject.next([...current, newNote]);
      }),
      catchError((err) => {
        this.errorSubject.next(err?.error?.error || "Failed to add note");
        return throwError(() => err);
      }),
    );
  }

  updateNote(
    noteId: number,
    payload: { title: string; content: string },
  ): Observable<NoteDto> {
    return this.apiClient.put<NoteDto>(`/notes/${noteId}`, payload).pipe(
      tap((updated) => {
        const notes = this.notesSubject.value;
        const idx = notes.findIndex((n) => n.id === noteId);
        if (idx !== -1) {
          notes[idx] = updated;
          this.notesSubject.next([...notes]);
        }
      }),
      catchError((err) => {
        this.errorSubject.next(err?.error?.error || "Failed to update note");
        return throwError(() => err);
      }),
    );
  }

  removeNoteFromQuiz(quizId: number, noteId: number): Observable<void> {
    return this.apiClient.delete<void>(`/quiz/${quizId}/notes/${noteId}`).pipe(
      tap(() => {
        const notes = this.notesSubject.value.filter((n) => n.id !== noteId);
        this.notesSubject.next(notes);
      }),
      catchError((err) => {
        this.errorSubject.next(err?.error?.error || "Failed to remove note");
        return throwError(() => err);
      }),
    );
  }

  // ─── Sources ─────────────────────────────────────────────────

  fetchQuizSources(quizId: number): void {
    this.sourcesLoadingSubject.next(true);
    this.apiClient
      .get<SourceDto[]>(`/quiz/${quizId}/sources`)
      .pipe(
        tap((sources) => this.sourcesSubject.next(sources)),
        catchError((err) => {
          this.errorSubject.next(
            err?.error?.error || "Failed to fetch sources",
          );
          return throwError(() => err);
        }),
        finalize(() => this.sourcesLoadingSubject.next(false)),
      )
      .subscribe();
  }

  addSourceToQuiz(quizId: number, sourceId: number): Observable<SourceDto> {
    return this.apiClient
      .post<SourceDto>(`/quiz/${quizId}/sources`, { sourceId })
      .pipe(
        tap((newSource) => {
          const current = this.sourcesSubject.value;
          this.sourcesSubject.next([...current, newSource]);
        }),
        catchError((err) => {
          this.errorSubject.next(
            err?.error?.error || "Failed to attach source",
          );
          return throwError(() => err);
        }),
      );
  }

  removeSourceFromQuiz(quizId: number, sourceId: number): Observable<void> {
    return this.apiClient
      .delete<void>(`/quiz/${quizId}/sources/${sourceId}`)
      .pipe(
        tap(() => {
          const sources = this.sourcesSubject.value.filter(
            (s) => s.id !== sourceId,
          );
          this.sourcesSubject.next(sources);
        }),
        catchError((err) => {
          this.errorSubject.next(
            err?.error?.error || "Failed to detach source",
          );
          return throwError(() => err);
        }),
      );
  }

  clearError(): void {
    this.errorSubject.next(null);
  }
}
