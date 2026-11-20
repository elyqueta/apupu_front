import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});

/**
 * Base usada apenas na navegação de página inteira do OAuth.
 *
 * Em produção é vazia: o Vercel reescreve `/auth/google*` para o Render e o
 * browser vê sempre apupu-front.vercel.app. Assim o cookie HttpOnly definido
 * pelo backend é guardado na origem da SPA (não numa origem de terceiros).
 */
export const OAUTH_BASE_URL = new InjectionToken<string>('OAUTH_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.oauthBaseUrl,
});

/** Monta o URL de entrada Google a partir da base configurada. */
export function googleAuthUrl(oauthBaseUrl: string): string {
  return `${oauthBaseUrl.replace(/\/+$/, '')}/auth/google`;
}
