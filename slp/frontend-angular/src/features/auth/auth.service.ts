import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, of, throwError } from "rxjs";
import { catchError, filter, map, switchMap, tap } from "rxjs/operators";
import { environment } from "../../environments/environment";

// ─── Public Models ────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  email: string;
  emailVerified: boolean; // mapped from API's emailConfirmed
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  avatarFilename: string | null;
  avatarUrl?: string; // computed client-side – never from API
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

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly baseUrl = environment.apiBackendUrl;
  private readonly fileStorageUrl = environment.fileStorageUrl;

  // Thay vì BehaviorSubject<User | null>
  private userSubject = new BehaviorSubject<User | null | undefined>(undefined);
  public user$ = this.userSubject.asObservable().pipe(
    // Bỏ qua giá trị undefined – chỉ emit khi đã load xong (có user hoặc null)
    filter((user): user is User | null => user !== undefined),
  );

  constructor(private http: HttpClient) {
    if (this.sessionToken) {
      this.fetchCurrentUser().subscribe({
        error: () => this.clearSession(),
      });
    } else {
      // Không có token → coi như không có user ngay lập tức
      this.userSubject.next(null);
    }
  }

  private extractErrorMessage(error: any): string {
    // If error.error is the parsed JSON body from the backend
    if (error.error?.message) {
      return error.error.message;
    }
    // Fallback to a generic message
    return error.message || "An error occurred";
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  get sessionToken(): string | null {
    return localStorage.getItem("session_token");
  }

  get isAuthenticated(): boolean {
    return !!this.sessionToken;
  }

  get currentUser(): User | null {
    return this.userSubject.value || null;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private buildAvatarUrl(
    filename: string | null | undefined,
  ): string | undefined {
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
    localStorage.removeItem("session_token");
    localStorage.removeItem("user_id");
    this.userSubject.next(null);
  }

  // ─── Auth actions ────────────────────────────────────────────────────────────

  /**
   * Logs the user in, stores the session token, and fetches the user profile.
   * Returns a LoginResult with `success`, optional `code`, and `message`.
   */
  login(username: string, password: string): Observable<LoginResult> {
    return this.http
      .post<LoginApiResponse>(`${this.baseUrl}/auth/login`, {
        username,
        password,
      })
      .pipe(
        tap((response) => {}),
        switchMap((response) => {
          localStorage.setItem("session_token", response.token);

          localStorage.setItem("user_id", response.userId);

          return this.fetchCurrentUser().pipe(
            tap(() => {}),
            map(() => {
              return { success: true } as LoginResult;
            }),
          );
        }),
        catchError((error) => {
          console.error("X. catchError caught an exception:", error);
          const data = error.error;

          const result: LoginResult = {
            success: false,
            code: data?.code,
            message: data?.message || "Login failed",
          };

          return of(result);
        }),
        tap((finalResult) => {}),
      );
  }

  register(
    username: string,
    email: string,
    password: string,
  ): Observable<{ success: boolean; message?: string }> {
    return this.http
      .post(`${this.baseUrl}/auth/register`, { username, email, password })
      .pipe(
        map(() => ({ success: true })),
        catchError((error) => {
          const message = this.extractErrorMessage(error);
          return of({ success: false, message });
        }),
      );
  }

  /** Calls logout endpoint (best-effort) then clears local state immediately. */
  logout(): void {
    this.http
      .post(`${this.baseUrl}/auth/logout`, {})
      .subscribe({ error: () => {} });
    this.clearSession();
  }

  // ─── User profile ────────────────────────────────────────────────────────────

  fetchCurrentUser(): Observable<User> {
    return this.http.get<UserApiResponse>(`${this.baseUrl}/users/me`).pipe(
      tap((raw) => this.userSubject.next(this.mapUser(raw))),
      map((raw) => this.mapUser(raw)),
      catchError((err) => {
        this.clearSession();
        return throwError(() => err);
      }),
    );
  }

  updateProfile(name: string, avatarUrl: string): Observable<boolean> {
    return this.http
      .put<UserApiResponse>(`${this.baseUrl}/users/me`, { name, avatarUrl })
      .pipe(
        tap((raw) => this.userSubject.next(this.mapUser(raw))),
        map(() => true),
        catchError(() => of(false)),
      );
  }

  // ─── Password management ─────────────────────────────────────────────────────

  requestPasswordReset(
    email: string,
  ): Observable<{ success: boolean; message?: string }> {
    return this.http
      .post(`${this.baseUrl}/auth/forgot-password`, { email })
      .pipe(
        map(() => ({ success: true })),
        catchError((error) => {
          const message = this.extractErrorMessage(error);
          return of({ success: false, message });
        }),
      );
  }

  confirmPasswordReset(
    token: string,
    newPassword: string,
  ): Observable<{ success: boolean; message?: string }> {
    return this.http
      .post(`${this.baseUrl}/auth/reset-password`, { token, newPassword })
      .pipe(
        map(() => ({ success: true })),
        catchError((error) => {
          const message = this.extractErrorMessage(error);
          return of({ success: false, message });
        }),
      );
  }

  /**
   * Changes the current user's password.
   * The backend revokes all other sessions but keeps the current one alive.
   */
  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Observable<ChangePasswordResult> {
    return this.http
      .post(`${this.baseUrl}/users/me/change-password`, {
        currentPassword,
        newPassword,
      })
      .pipe(
        map(() => ({ success: true }) as ChangePasswordResult),
        catchError((error) => {
          const data = error.error;
          return of<ChangePasswordResult>({
            success: false,
            code: data?.code,
            message: data?.message || "Failed to change password.",
          });
        }),
      );
  }

  // ─── Email verification ──────────────────────────────────────────────────────

  verifyEmail(
    token: string,
  ): Observable<{ success: boolean; message?: string }> {
    return this.http.post(`${this.baseUrl}/auth/verify-email`, { token }).pipe(
      tap(() => {
        const user = this.userSubject.value;
        if (user) this.userSubject.next({ ...user, emailVerified: true });
      }),
      map(() => ({ success: true })),
      catchError((error) => {
        const message = this.extractErrorMessage(error);
        return of({ success: false, message });
      }),
    );
  }

  sendVerificationEmail(): Observable<{ success: boolean; message?: string }> {
    return this.http.post(`${this.baseUrl}/auth/resend-verification`, {}).pipe(
      map(() => ({ success: true })),
      catchError((error) => {
        const message = this.extractErrorMessage(error);
        return of({ success: false, message });
      }),
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
