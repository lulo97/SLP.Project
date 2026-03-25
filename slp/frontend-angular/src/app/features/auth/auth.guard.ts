import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const AuthGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (localStorage.getItem('session_token')) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
