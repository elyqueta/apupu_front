import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authenticatedGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const host = await auth.restoreSession();
  return host ? true : router.createUrlTree(['/entrar'], { queryParams: { returnUrl: state.url } });
};
