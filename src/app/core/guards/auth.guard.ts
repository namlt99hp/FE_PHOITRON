import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.me().pipe(
    map(status => {
      if (status.ok) {
        return true; // Cho phép vào
      } else {
        // Nếu chưa đăng nhập thì điều hướng sang trang MVC login
        const returnUrl = encodeURIComponent(location.href);
        window.location.href = `${auth.loginUrl}?returnUrl=${returnUrl}`;
        return false;
      }
    })
  );
};
