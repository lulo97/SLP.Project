import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, throwError } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
import { Router } from "@angular/router";
import { environment } from "../../../environments/environment";
import { ApiClientService } from "./api-client.service";

export interface User {
  id: number;
  username: string;
  email: string;
  emailConfirmed: boolean;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  avatarFilename: string | null;
  avatarUrl?: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  email: string;
}

export interface ChangePasswordResult {
  success: boolean;
  code?: string; // e.g., "INVALID_CURRENT_PASSWORD" | "WEAK_PASSWORD"
  message?: string;
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  private sessionTokenSubject = new BehaviorSubject<string | null>(
    localStorage.getItem("session_token"),
  );
  public sessionToken$ = this.sessionTokenSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  constructor(
    private apiClient: ApiClientService,
    private router: Router,
  ) {
    if (this.sessionTokenSubject.value) {
      this.fetchCurrentUser().subscribe();
    }
  }

  get isAuthenticated(): boolean {
    return !!this.sessionTokenSubject.value;
  }

  get isAdmin(): boolean {
    return this.userSubject.value?.role === "admin";
  }

  get isEmailVerified(): boolean {
    return this.userSubject.value?.emailConfirmed || false;
  }

  get sessionToken(): string | null {
    return this.sessionTokenSubject.value;
  }

  get user(): User | null {
    return this.userSubject.value;
  }

  /**
   * Login user
   */
  login(username: string, password: string): Observable<{ success: boolean }> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient
      .post<LoginResponse>("/auth/login", { username, password })
      .pipe(
        tap((response) => {
          const { token, userId } = response;
          this.sessionTokenSubject.next(token);
          localStorage.setItem("session_token", token);
          localStorage.setItem("user_id", userId);
          this.fetchCurrentUser().subscribe();
        }),
        map(() => ({ success: true })),
        catchError((error) => {
          const errorData = error.error;
          const message = errorData?.message || "Login failed";
          this.errorSubject.next(message);
          return throwError(() => ({
            success: false,
            code: errorData?.code,
            message,
          }));
        }),
        tap(() => this.loadingSubject.next(false)),
      );
  }

  /**
   * Register new user
   */
  register(
    username: string,
    email: string,
    password: string,
  ): Observable<boolean> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient
      .post("/auth/register", { username, email, password })
      .pipe(
        map(() => true),
        catchError((error) => {
          const message = error.error?.message || "Registration failed";
          this.errorSubject.next(message);
          return throwError(() => false);
        }),
        tap(() => this.loadingSubject.next(false)),
      );
  }

  /**
   * Logout user
   */
  logout(): void {
    this.apiClient
      .post("/auth/logout", {})
      .pipe(catchError(() => []))
      .subscribe();
    this.clearSession();
    this.router.navigate(["/login"]);
  }

  /**
   * Fetch current logged-in user
   */
  fetchCurrentUser(): Observable<User> {
    return this.apiClient.get<User>("/users/me").pipe(
      tap((raw) => {
        const avatarUrl = raw.avatarFilename
          ? `${environment.fileStorageUrl}/files/${raw.avatarFilename}`
          : undefined;
        const user: User = { ...raw, avatarUrl };
        this.userSubject.next(user);
      }),
    );
  }

  /**
   * Update user profile (name and optional avatar)
   */
  updateProfile(name: string, avatarFile?: File): Observable<boolean> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    const formData = new FormData();
    formData.append("name", name);
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }
    return this.apiClient.put<User>("/users/me", formData).pipe(
      tap((updated) => {
        const avatarUrl = updated.avatarFilename
          ? `${environment.fileStorageUrl}/files/${updated.avatarFilename}`
          : undefined;
        const user: User = { ...updated, avatarUrl };
        this.userSubject.next(user);
      }),
      map(() => true),
      catchError((error) => {
        const message = error.error?.message || "Update failed";
        this.errorSubject.next(message);
        return throwError(() => false);
      }),
      tap(() => this.loadingSubject.next(false)),
    );
  }

  /**
   * Request password reset email
   */
  requestPasswordReset(email: string): Observable<boolean> {
    return this.apiClient.post("/auth/forgot-password", { email }).pipe(
      map(() => true),
      catchError(() => throwError(() => false)),
    );
  }

  /**
   * Confirm password reset with token and new password
   */
  confirmPasswordReset(
    token: string,
    newPassword: string,
  ): Observable<boolean> {
    return this.apiClient
      .post("/auth/reset-password", { token, newPassword })
      .pipe(
        map(() => true),
        catchError(() => throwError(() => false)),
      );
  }

  /**
   * Verify email with token
   */
  verifyEmail(token: string): Observable<boolean> {
    return this.apiClient.post("/auth/verify-email", { token }).pipe(
      tap(() => {
        if (this.userSubject.value) {
          const updated = { ...this.userSubject.value, emailConfirmed: true };
          this.userSubject.next(updated);
        }
      }),
      map(() => true),
      catchError(() => throwError(() => false)),
    );
  }

  /**
   * Resend verification email
   */
  sendVerificationEmail(): Observable<boolean> {
    return this.apiClient.post("/auth/resend-verification", {}).pipe(
      map(() => true),
      catchError(() => throwError(() => false)),
    );
  }

  /**
   * Change password for logged-in user
   */
  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Observable<ChangePasswordResult> {
    return this.apiClient
      .post("/users/me/change-password", { currentPassword, newPassword })
      .pipe(
        map(() => ({ success: true })),
        catchError((error) => {
          const data = error.error;
          return throwError(() => ({
            success: false,
            code: data?.code,
            message: data?.message || "Failed to change password.",
          }));
        }),
      );
  }

  /**
   * Clear any stored error
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Ensure user data is loaded (for guards)
   */
  async ensureUserLoaded(): Promise<User | null> {
    if (this.userSubject.value) return this.userSubject.value;
    if (!this.sessionTokenSubject.value) return null;
    try {
      await this.fetchCurrentUser().toPromise();
      return this.userSubject.value;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    this.sessionTokenSubject.next(null);
    this.userSubject.next(null);
    localStorage.removeItem("session_token");
    localStorage.removeItem("user_id");
  }
}
