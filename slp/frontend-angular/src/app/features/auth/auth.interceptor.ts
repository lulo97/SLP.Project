import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Endpoints that may return 401 during normal use (login, register, etc.).
 * We do NOT redirect to /login for these — the component handles the error.
 */
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('session_token');

  // Attach the session token header on every outgoing request
  const authReq = token
    ? req.clone({ setHeaders: { 'X-Session-Token': token } })
    : req;

  return next(authReq).pipe(
    catchError(error => {
      if (error.status === 401) {
        const url = req.url;
        const isPublic = PUBLIC_ENDPOINTS.some(ep => url.includes(ep));

        if (!isPublic) {
          // Token invalid / expired – clear storage and navigate to login
          localStorage.removeItem('session_token');
          localStorage.removeItem('user_id');
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    }),
  );
};
