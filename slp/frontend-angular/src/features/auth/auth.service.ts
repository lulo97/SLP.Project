import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ─── Public Models ────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  email: string;
  emailVerified: boolean;   // mapped from API's emailConfirmed
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  avatarFilename: string | null;
  avatarUrl?: string;       // computed client-side – never from API
}

export interface LoginResult {
  success: boolean;
  code?: string;
  message?: string;
}

export interface ChangePasswordResult {
  success: boolean;
  code?: string;
  message?: string;
}

// ─── Internal API shapes ──────────────────────────────────────────────────────

interface LoginApiResponse {
  token: string;
  userId: string;
  email: string;
}

interface UserApiResponse {
  id: number;
  username: string;
  email: string;
  emailConfirmed: boolean;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  avatarFilename: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = environment.apiBackendUrl;
  private readonly fileStorageUrl = environment.fileStorageUrl;

  private userSubject = new BehaviorSubject<User | null>(null);
  /** Observable stream of the currently authenticated user (null if logged out). */
  user$: Observable<User | null> = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    // Rehydrate user from an existing session on app startup
    if (this.sessionToken) {
      this.fetchCurrentUser().subscribe({ error: () => this.clearSession() });
    }
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  get sessionToken(): string | null {
    return localStorage.getItem('session_token');
  }

  get isAuthenticated(): boolean {
    return !!this.sessionToken;
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private buildAvatarUrl(filename: string | null | undefined): string | undefined {
    if (!filename) return undefined;
    return `${this.fileStorageUrl}/files/${filename}`;
  }

  private mapUser(raw: UserApiResponse): User {
    return {
      id: raw.id,
      username: raw.username,
      email: raw.email,
      emailVerified: raw.emailConfirmed,
      role: raw.role,
      status: raw.status,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      avatarFilename: raw.avatarFilename,
      avatarUrl: this.buildAvatarUrl(raw.avatarFilename),
    };
  }

  private clearSession(): void {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user_id');
    this.userSubject.next(null);
  }

  // ─── Auth actions ────────────────────────────────────────────────────────────

  /**
   * Logs the user in, stores the session token, and fetches the user profile.
   * Returns a LoginResult with `success`, optional `code`, and `message`.
   */
  login(username: string, password: string): Observable<LoginResult> {
    return this.http
      .post<LoginApiResponse>(`${this.baseUrl}/auth/login`, { username, password })
      .pipe(
        switchMap(response => {
          localStorage.setItem('session_token', response.token);
          localStorage.setItem('user_id', response.userId);
          return this.fetchCurrentUser().pipe(map(() => ({ success: true } as LoginResult)));
        }),
        catchError(error => {
          const data = error.error;
          return of<LoginResult>({
            success: false,
            code: data?.code,
            message: data?.message || 'Login failed',
          });
        }),
      );
  }

  register(username: string, email: string, password: string): Observable<boolean> {
    return this.http
      .post(`${this.baseUrl}/auth/register`, { username, email, password })
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );
  }

  /** Calls logout endpoint (best-effort) then clears local state immediately. */
  logout(): void {
    this.http.post(`${this.baseUrl}/auth/logout`, {}).subscribe({ error: () => {} });
    this.clearSession();
  }

  // ─── User profile ────────────────────────────────────────────────────────────

  fetchCurrentUser(): Observable<User> {
    return this.http.get<UserApiResponse>(`${this.baseUrl}/users/me`).pipe(
      tap(raw => this.userSubject.next(this.mapUser(raw))),
      map(raw => this.mapUser(raw)),
    );
  }

  updateProfile(name: string, avatarUrl: string): Observable<boolean> {
    return this.http
      .put<UserApiResponse>(`${this.baseUrl}/users/me`, { name, avatarUrl })
      .pipe(
        tap(raw => this.userSubject.next(this.mapUser(raw))),
        map(() => true),
        catchError(() => of(false)),
      );
  }

  // ─── Password management ─────────────────────────────────────────────────────

  requestPasswordReset(email: string): Observable<boolean> {
    return this.http
      .post(`${this.baseUrl}/auth/forgot-password`, { email })
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );
  }

  confirmPasswordReset(token: string, newPassword: string): Observable<boolean> {
    return this.http
      .post(`${this.baseUrl}/auth/reset-password`, { token, newPassword })
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );
  }

  /**
   * Changes the current user's password.
   * The backend revokes all other sessions but keeps the current one alive.
   */
  changePassword(currentPassword: string, newPassword: string): Observable<ChangePasswordResult> {
    return this.http
      .post(`${this.baseUrl}/users/me/change-password`, { currentPassword, newPassword })
      .pipe(
        map(() => ({ success: true } as ChangePasswordResult)),
        catchError(error => {
          const data = error.error;
          return of<ChangePasswordResult>({
            success: false,
            code: data?.code,
            message: data?.message || 'Failed to change password.',
          });
        }),
      );
  }

  // ─── Email verification ──────────────────────────────────────────────────────

  verifyEmail(token: string): Observable<boolean> {
    return this.http
      .post(`${this.baseUrl}/auth/verify-email`, { token })
      .pipe(
        tap(() => {
          const user = this.userSubject.value;
          if (user) this.userSubject.next({ ...user, emailVerified: true });
        }),
        map(() => true),
        catchError(() => of(false)),
      );
  }

  sendVerificationEmail(): Observable<boolean> {
    return this.http
      .post(`${this.baseUrl}/auth/resend-verification`, {})
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────

  /** Returns the current user if available, or fetches from server. */
  fetchUserIfNeeded(): Observable<User | null> {
    if (this.userSubject.value) return of(this.userSubject.value);
    if (!this.sessionToken) return of(null);
    return this.fetchCurrentUser().pipe(catchError(() => of(null)));
  }
}
