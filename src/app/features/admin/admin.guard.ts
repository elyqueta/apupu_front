import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Host } from '../../core/api/api.models';
import { AuthService } from '../../core/api/auth.service';

/**
 * A flag `is_super_admin` viaja no DTO da sessão. O tipo local acrescenta o
 * campo sem editar os modelos partilhados, que são propriedade de outro bloco.
 */
type AdminHost = Host & { is_super_admin?: boolean; isSuperAdmin?: boolean };

/**
 * Guarda do painel de administração. Quem não tem sessão vai para o login;
 * quem tem sessão mas não é super admin volta ao painel normal, sem mensagem
 * que revele detalhes do papel.
 */
export const superAdminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const host = (await auth.restoreSession()) as AdminHost | null;
  if (!host) {
    return router.createUrlTree(['/entrar'], { queryParams: { returnUrl: state.url } });
  }

  const isAdmin = host.is_super_admin === true || host.isSuperAdmin === true;
  return isAdmin ? true : router.createUrlTree(['/painel']);
};
