import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, REQUEST } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError, toApiError } from './api-error';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class CsrfTokenStore {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly values = new Map<string, string>();

  set(token: string | null, apiPath = ''): void {
    const scope = this.scope(apiPath);
    if (!scope) {
      return;
    }
    if (token) {
      this.values.set(scope, token);
    } else {
      this.values.delete(scope);
    }
  }

  get(url: string): string | null {
    const path = apiPathFromUrl(url);
    const scope = this.scope(path);
    if (!scope) {
      return null;
    }
    const token = this.read(scope);
    if (token) {
      return token;
    }
    // Sessão de conta: o backend autoriza a conta do anfitrião nos eventos de que
    // é proprietário, pelo que o token CSRF do escopo `auth` também serve para
    // `host:{eventId}`. O token de gestão legado, quando existe, tem prioridade.
    if (scope.startsWith('host:')) {
      return this.read('auth');
    }
    return null;
  }

  private read(scope: string): string | null {
    const cached = this.values.get(scope);
    if (cached) {
      return cached;
    }
    if (!this.browser || scope === 'auth') {
      return null;
    }
    const cookieName = csrfCookieName(scope);
    const cookie = this.document.cookie
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${cookieName}=`));
    if (!cookie) {
      return null;
    }
    const token = cookie.slice(cookieName.length + 1);
    this.values.set(scope, token);
    return token;
  }

  private scope(apiPath: string): string | null {
    const path = apiPathFromUrl(apiPath);
    // O painel admin autentica com a mesma sessão de conta (`apupu_auth`),
    // pelo que usa o CSRF do login — tal como as rotas `/host/*` da conta.
    if (path.startsWith('/auth/') || path.startsWith('/admin/')) {
      return 'auth';
    }
    if (path.startsWith('/public/invitations/')) {
      return 'guest';
    }
    if (path === '/host/session') {
      return null;
    }
    const eventId = path.match(/^\/host\/(?:events|session)\/([^/]+)/)?.[1];
    if (eventId) {
      return `host:${eventId}`;
    }
    // A rota de registo do gestor não tem `eventId` no caminho: usa o
    // cookie/CSRF da sessão de gestão guardado quando o gestor entrou.
    if (path === '/host/manager/register/request-code') {
      return [...this.values.keys()].find((key) => key.startsWith('host:')) ?? 'auth';
    }
    return path.startsWith('/host/') ? 'auth' : null;
  }
}

export const apiRequestInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/v1/') && !request.url.includes('/api/v1/')) {
    return next(request);
  }

  const apiBaseUrl = inject(API_BASE_URL);
  const incomingRequest = inject(REQUEST, { optional: true });
  const token = inject(CsrfTokenStore).get(request.url);
  const mutating = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method);
  let headers = mutating && token ? request.headers.set('X-CSRF-Token', token) : request.headers;
  const authCookie = incomingAuthCookie(incomingRequest, apiBaseUrl, request.url);
  if (authCookie) {
    headers = headers.set('Cookie', authCookie);
  }

  // A autorização é o cookie HttpOnly `apupu_auth`. Não existe token no
  // browser: o interceptor apenas garante `credentials: include` e o CSRF.
  return next(request.clone({ withCredentials: true, headers }));
};

function apiPathFromUrl(url: string): string {
  const apiIndex = url.indexOf('/api/v1');
  return apiIndex === -1 ? url : url.slice(apiIndex + '/api/v1'.length);
}

function csrfCookieName(scope: string): string {
  if (scope.startsWith('host:')) {
    return `apupu_csrf_host_${scope.slice('host:'.length)}`;
  }
  return `apupu_csrf_${scope}`;
}

function incomingAuthCookie(
  incomingRequest: Request | null,
  apiBaseUrl: string,
  requestUrl: string,
): string | null {
  if (!incomingRequest) {
    return null;
  }
  const apiHost = new URL(apiBaseUrl).hostname;
  if (
    new URL(incomingRequest.url).hostname !== apiHost ||
    new URL(requestUrl).hostname !== apiHost
  ) {
    return null;
  }
  const authCookie = incomingRequest.headers
    .get('cookie')
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('apupu_auth='));
  return authCookie ?? null;
}

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        return throwError(() => toApiError(error));
      }
      if (error instanceof ApiError) {
        return throwError(() => error);
      }
      return throwError(() => error);
    }),
  );
