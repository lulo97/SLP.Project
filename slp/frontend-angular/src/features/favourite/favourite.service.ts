import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, throwError } from "rxjs";
import { catchError, tap, finalize } from "rxjs/operators";
import { ApiClientService } from "../../services/api-client.service";
import { Favorite } from "./favourite.model";
import { PaginatedResult } from "../../utils/pagination.utils";

@Injectable({ providedIn: "root" })
export class FavoriteService {
  // State
  private favoritesSubject = new BehaviorSubject<Favorite[]>([]);
  public favorites$ = this.favoritesSubject.asObservable();

  private currentFavoriteSubject = new BehaviorSubject<Favorite | null>(null);
  public currentFavorite$ = this.currentFavoriteSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  private totalSubject = new BehaviorSubject<number>(0);
  public total$ = this.totalSubject.asObservable();

  private pageSubject = new BehaviorSubject<number>(1);
  public page$ = this.pageSubject.asObservable();

  private pageSizeSubject = new BehaviorSubject<number>(10);
  public pageSize$ = this.pageSizeSubject.asObservable();

  private currentSearchSubject = new BehaviorSubject<string>("");
  public currentSearch$ = this.currentSearchSubject.asObservable();

  constructor(private apiClient: ApiClientService) {}

  fetchFavorites(
    search?: string,
    page: number = 1,
    pageSize: number = 10,
  ): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const params: any = { page, pageSize };
    if (search) params.search = search;

    this.apiClient
      .get<PaginatedResult<Favorite>>("/favorites", { params })
      .pipe(
        tap((result) => {
          this.favoritesSubject.next(result.items);
          this.totalSubject.next(result.total);
          this.pageSubject.next(result.page);
          this.pageSizeSubject.next(result.pageSize);
          this.currentSearchSubject.next(search || "");
        }),
        catchError((err) => {
          this.errorSubject.next(
            err?.error?.message || "Failed to load favourites",
          );
          return throwError(() => err);
        }),
        finalize(() => this.loadingSubject.next(false)),
      )
      .subscribe();
  }

  fetchFavoriteById(id: number): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.apiClient
      .get<Favorite>(`/favorites/${id}`)
      .pipe(
        tap((fav) => this.currentFavoriteSubject.next(fav)),
        catchError((err) => {
          this.errorSubject.next(
            err?.error?.message || "Failed to load favourite",
          );
          return throwError(() => err);
        }),
        finalize(() => this.loadingSubject.next(false)),
      )
      .subscribe();
  }

  createFavorite(
    text: string,
    type: string,
    note?: string,
  ): Observable<Favorite> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient
      .post<Favorite>("/favorites", { text, type, note })
      .pipe(
        tap((newFav) => {
          const current = this.favoritesSubject.value;
          this.favoritesSubject.next([newFav, ...current]);
          this.loadingSubject.next(false);
        }),
        catchError((err) => {
          this.errorSubject.next(
            err?.error?.message || "Failed to create favourite",
          );
          this.loadingSubject.next(false);
          return throwError(() => err);
        }),
      );
  }

  updateFavorite(
    id: number,
    text: string,
    type: string,
    note?: string,
  ): Observable<Favorite> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient
      .put<Favorite>(`/favorites/${id}`, { text, type, note })
      .pipe(
        tap((updated) => {
          const favorites = this.favoritesSubject.value;
          const index = favorites.findIndex((f) => f.id === id);
          if (index !== -1) {
            favorites[index] = updated;
            this.favoritesSubject.next([...favorites]);
          }
          if (this.currentFavoriteSubject.value?.id === id) {
            this.currentFavoriteSubject.next(updated);
          }
          this.loadingSubject.next(false);
        }),
        catchError((err) => {
          this.errorSubject.next(
            err?.error?.message || "Failed to update favourite",
          );
          this.loadingSubject.next(false);
          return throwError(() => err);
        }),
      );
  }

  deleteFavorite(id: number): Observable<void> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient.delete<void>(`/favorites/${id}`).pipe(
      tap(() => {
        const favorites = this.favoritesSubject.value.filter(
          (f) => f.id !== id,
        );
        this.favoritesSubject.next(favorites);
        if (this.currentFavoriteSubject.value?.id === id) {
          this.currentFavoriteSubject.next(null);
        }
        this.loadingSubject.next(false);
      }),
      catchError((err) => {
        this.errorSubject.next(
          err?.error?.message || "Failed to delete favourite",
        );
        this.loadingSubject.next(false);
        return throwError(() => err);
      }),
    );
  }

  resetCurrentFavorite(): void {
    this.currentFavoriteSubject.next(null);
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  get currentPage(): number {
    return this.pageSubject.value;
  }
}
