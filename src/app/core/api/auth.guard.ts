import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authenticatedGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const host = await auth.restoreSession();
  return host ? true : router.createUrlTree(['/entrar'], { queryParams: { returnUrl: state.url } });
};

/**
 * A entrada de gestão por link/código é para quem não está autenticado.
 * Quem já tem conta e sessão é levado diretamente para os seus eventos;
 * os links secretos (`/gerir/:token`, `/gestao/:token`) não são afetados.
 */
export const unauthenticatedOnlyGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const host = await auth.restoreSession();
  return host ? router.createUrlTree(['/eventos']) : true;
};
