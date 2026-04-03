import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, throwError } from "rxjs";
import { catchError, finalize, tap } from "rxjs/operators";
import { ApiClientService } from "../../../services/api-client.service";
import { WordOfTheDay, UserStats, TopQuiz } from "../models/dashboard.models";

@Injectable({ providedIn: "root" })
export class DashboardService {
  private wordOfTheDaySubject = new BehaviorSubject<WordOfTheDay | null>(null);
  private userStatsSubject = new BehaviorSubject<UserStats | null>(null);
  private topQuizzesSubject = new BehaviorSubject<TopQuiz[]>([]);

  // Loading states
  private loadingWordSubject = new BehaviorSubject<boolean>(false);
  private loadingStatsSubject = new BehaviorSubject<boolean>(false);
  private loadingQuizzesSubject = new BehaviorSubject<boolean>(false);

  // Error states
  private errorWordSubject = new BehaviorSubject<string | null>(null);
  private errorStatsSubject = new BehaviorSubject<string | null>(null);
  private errorQuizzesSubject = new BehaviorSubject<string | null>(null);

  // Public observables
  wordOfTheDay$ = this.wordOfTheDaySubject.asObservable();
  userStats$ = this.userStatsSubject.asObservable();
  topQuizzes$ = this.topQuizzesSubject.asObservable();

  loadingWord$ = this.loadingWordSubject.asObservable();
  loadingStats$ = this.loadingStatsSubject.asObservable();
  loadingQuizzes$ = this.loadingQuizzesSubject.asObservable();

  errorWord$ = this.errorWordSubject.asObservable();
  errorStats$ = this.errorStatsSubject.asObservable();
  errorQuizzes$ = this.errorQuizzesSubject.asObservable();

  constructor(private apiClient: ApiClientService) {}

  fetchWordOfTheDay(): Observable<WordOfTheDay> {
    this.loadingWordSubject.next(true);
    this.errorWordSubject.next(null);
    return this.apiClient.get<WordOfTheDay>("/dashboard/word-of-the-day").pipe(
      tap((word) => this.wordOfTheDaySubject.next(word)),
      catchError((err) => {
        this.errorWordSubject.next(
          err.error?.message || "Failed to load word of the day",
        );
        return throwError(() => err);
      }),
      finalize(() => this.loadingWordSubject.next(false)), // always runs
    );
  }

  fetchUserStats(): Observable<UserStats> {
    this.loadingStatsSubject.next(true);
    this.errorStatsSubject.next(null);
    return this.apiClient.get<UserStats>("/dashboard/user-stats").pipe(
      tap((stats) => this.userStatsSubject.next(stats)),
      catchError((err) => {
        const msg = err.error?.message || "Failed to load user stats";
        this.errorStatsSubject.next(msg);
        return throwError(() => err);
      }),
      tap(() => this.loadingStatsSubject.next(false)),
    );
  }

  fetchTopQuizzes(limit = 5): Observable<TopQuiz[]> {
    this.loadingQuizzesSubject.next(true);
    this.errorQuizzesSubject.next(null);
    return this.apiClient
      .get<TopQuiz[]>("/dashboard/top-quizzes", { params: { limit } })
      .pipe(
        tap((quizzes) => this.topQuizzesSubject.next(quizzes)),
        catchError((err) => {
          const msg = err.error?.message || "Failed to load top quizzes";
          this.errorQuizzesSubject.next(msg);
          return throwError(() => err);
        }),
        tap(() => this.loadingQuizzesSubject.next(false)),
      );
  }

  refreshAll(): void {
    this.fetchWordOfTheDay().subscribe();
    this.fetchUserStats().subscribe();
    this.fetchTopQuizzes().subscribe();
  }
}
