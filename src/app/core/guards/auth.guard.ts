import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  const hasUser = !!localStorage.getItem('phoitron_user');
  if (hasUser) return true;

  router.navigate(['/login']);
  return false;
};
