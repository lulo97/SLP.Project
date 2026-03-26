import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, throwError } from "rxjs";
import { catchError, tap, finalize } from "rxjs/operators";
import { ApiClientService } from "../../../services/api-client.service";
import {
  Source,
  SourceListItem,
  PagedResult,
  SourceQueryParams,
} from "../models/source.model";

@Injectable({ providedIn: "root" })
export class SourceService {
  // State
  private sourcesSubject = new BehaviorSubject<SourceListItem[]>([]);
  public sources$ = this.sourcesSubject.asObservable();

  private paginationSubject = new BehaviorSubject<
    Omit<PagedResult<never>, "items">
  >({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  public pagination$ = this.paginationSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  constructor(private api: ApiClientService) {}

  fetchSources(params: SourceQueryParams): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const query: any = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    };
    if (params.search) query.search = params.search;
    if (params.type) query.type = params.type;

    this.api
      .get<PagedResult<SourceListItem>>("/source", { params: query })
      .pipe(
        tap((result) => {
          this.sourcesSubject.next(result.items);
          this.paginationSubject.next({
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
            totalPages: result.totalPages,
          });
        }),
        catchError((err) => {
          let errorMessage = "Failed to load sources";
          if (err?.error) {
            if (typeof err.error === "string") {
              errorMessage = err.error;
            } else if (err.error.message) {
              errorMessage = err.error.message;
            } else if (Array.isArray(err.error.error)) {
              errorMessage = err.error.error.join(", ");
            }
          }
          this.errorSubject.next(errorMessage);
          return throwError(() => err);
        }),
        finalize(() => this.loadingSubject.next(false)),
      )
      .subscribe();
  }

  deleteSource(id: number): Observable<void> {
    return this.api.delete<void>(`/source/${id}`).pipe(
      tap(() => {
        // Update list by removing deleted item
        const updated = this.sourcesSubject.value.filter((s) => s.id !== id);
        this.sourcesSubject.next(updated);
        const pagination = this.paginationSubject.value;
        this.paginationSubject.next({
          ...pagination,
          total: Math.max(0, pagination.total - 1),
        });
      }),
      catchError((err) => {
        this.errorSubject.next(
          err?.error?.message || "Failed to delete source",
        );
        return throwError(() => err);
      }),
    );
  }

  uploadSource(file: File, title?: string): Observable<Source> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);

    // Remove the headers object entirely
    return this.api
      .post<Source>("/source/upload", formData)
      .pipe(finalize(() => this.loadingSubject.next(false)));
  }

  createSourceFromUrl(payload: {
    url: string;
    title?: string;
  }): Observable<Source> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.api
      .post<Source>("/source/url", payload)
      .pipe(finalize(() => this.loadingSubject.next(false)));
  }

  createSourceFromNote(payload: {
    title: string;
    content: string;
  }): Observable<Source> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.api
      .post<Source>("/source/note", payload)
      .pipe(finalize(() => this.loadingSubject.next(false)));
  }

  clearError(): void {
    this.errorSubject.next(null);
  }
}
