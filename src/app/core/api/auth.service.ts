import { Injectable, inject, signal } from '@angular/core';
import { ApiClient } from './api-client';
import { ApiError } from './api-error';
import { Host } from './api.models';
import { SessionCache } from '../services/session-cache';

/**
 * Serviço de autenticação do anfitrião, alinhado com o contrato de contas
 * (`/auth/register/*`, `/auth/login`, `/auth/session`, `/auth/logout`, …).
 *
 * A sessão é gerida por cookies HttpOnly definidos pelo backend; o token bruto
 * nunca é devolvido em JSON nem guardado aqui. O `csrf_token` devolvido pelo
 * login/registo/sessão é guardado pelo `CsrfTokenStore` (via `ApiClient`) e
 * enviado em `X-CSRF-Token` nos pedidos mutáveis.
 *
 * O registo termina com uma sessão já iniciada: `register()` devolve o
 * anfitrião e marca o estado como autenticado, tal como o `login()`.
 */

export interface RegistrationCodeResponse {
  status: 'accepted';
  email: string;
  expires_at: string;
  resend_available_at: string;
}

interface RegistrationVerificationResponse {
  email: string;
  verification_token: string;
  expires_at: string;
}

interface SessionResponse {
  host: Host;
  csrf_token: string;
  expires_at: string;
}

type SessionPayload = Omit<SessionResponse, 'expires_at'>;

export type SocialProvider = 'google' | 'facebook';

const SOCIAL_LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly sessions = inject(SessionCache);

  private readonly hostState = signal<Host | null>(null);
  private readonly readyState = signal(false);
  /** Promessa partilhada para não repetir `GET /auth/session` em cada navegação. */
  private restorePromise: Promise<Host | null> | null = null;

  readonly host = this.hostState.asReadonly();
  readonly ready = this.readyState.asReadonly();
  /** Token devolvido pela verificação do código, usado no passo final do registo. */
  readonly verificationToken = signal<string | null>(null);

  /**
   * Devolve o anfitrião com sessão, ou `null`. Reutiliza o resultado em memória
   * e só consulta o backend uma vez por ciclo de sessão.
   */
  async restoreSession(): Promise<Host | null> {
    const current = this.hostState();
    if (current) {
      return current;
    }
    if (!this.restorePromise) {
      this.restorePromise = this.fetchSession();
    }
    return this.restorePromise;
  }

  /**
   * Inicia sessão de conta. O backend define os cookies `apupu_auth` (HttpOnly)
   * e `apupu_csrf_auth`, e devolve o `csrf_token` e o anfitrião.
   */
  async login(email: string, password: string, remember = false): Promise<Host> {
    // O contrato atual não tem campo `remember`: a duração da sessão é decidida
    // pelo backend. Mantemos o parâmetro para não alterar a assinatura pública.
    void remember;
    const response = await this.api.post<SessionResponse>('/auth/login', {
      email: email.trim(),
      password,
    });
    return this.startSession(response);
  }

  /** Passo 1 do registo: valida o email e enfileira o código OTP. */
  async requestRegistrationCode(email: string): Promise<RegistrationCodeResponse> {
    return this.api.post<RegistrationCodeResponse>('/auth/register/request-code', {
      email: email.trim(),
    });
  }

  /** Passo 2 do registo: troca o código por um `verification_token` de uso único. */
  async verifyRegistrationCode(email: string, code: string): Promise<void> {
    const response = await this.api.post<RegistrationVerificationResponse>(
      '/auth/register/verify-code',
      { email: email.trim(), code },
    );
    this.verificationToken.set(response.verification_token);
  }

  /**
   * Passo 3 do registo: cria a conta. A resposta define os cookies de sessão
   * (HttpOnly) e devolve o anfitrião e o `csrf_token`, pelo que o utilizador
   * fica autenticado sem novo login.
   */
  async register(email: string, password: string, displayName: string): Promise<Host> {
    const verificationToken = this.verificationToken();
    if (!verificationToken) {
      throw new ApiError(
        422,
        'verification_required',
        'Confirma o teu email antes de criar a conta.',
      );
    }
    const response = await this.api.post<SessionResponse>('/auth/register', {
      email: email.trim(),
      password,
      display_name: displayName.trim() || null,
      verification_token: verificationToken,
    });
    this.verificationToken.set(null);
    return this.startSession(response);
  }

  /** Pede o link de reposição. Nunca revela se o email existe. */
  async requestPasswordReset(email: string): Promise<void> {
    await this.api.post<{ status: 'accepted' }>('/auth/password/forgot', {
      email: email.trim(),
    });
  }

  /** Consome o token do link e define a nova senha. */
  async resetPassword(token: string, password: string): Promise<void> {
    await this.api.postNoContent('/auth/password/reset', { token, password });
  }

  /** Altera a senha da conta autenticada. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.api.postNoContent('/auth/password/change', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  /**
   * Inicia a autenticação social.
   * TODO: contrato não confirmado — iniciar OAuth Google/Facebook.
   */
  async loginWithProvider(provider: SocialProvider): Promise<void> {
    throw new ApiError(
      501,
      'provider_not_configured',
      `A entrada com ${SOCIAL_LABELS[provider]} ainda não está disponível.`,
    );
  }

  /** Termina a sessão no backend e limpa o estado local. */
  async logout(): Promise<void> {
    try {
      await this.api.postNoContent('/auth/logout');
    } finally {
      this.clearSession();
    }
  }

  private async fetchSession(): Promise<Host | null> {
    try {
      const response = await this.api.get<SessionPayload>('/auth/session');
      this.hostState.set(response.host);
      return response.host;
    } catch {
      // 401 (ou falha de rede) significa "sem sessão" para efeitos de navegação.
      this.hostState.set(null);
      return null;
    } finally {
      this.readyState.set(true);
    }
  }

  private startSession(response: SessionResponse): Host {
    // Nova sessão: limpa os caches de dados do anfitrião anterior antes de
    // expor o novo utilizador, para que nenhuma página veja dados antigos.
    this.sessions.resetAll();
    this.hostState.set(response.host);
    this.readyState.set(true);
    this.restorePromise = Promise.resolve(response.host);
    return response.host;
  }

  private clearSession(): void {
    this.sessions.resetAll();
    this.hostState.set(null);
    this.verificationToken.set(null);
    this.readyState.set(true);
    this.restorePromise = Promise.resolve(null);
  }
}
