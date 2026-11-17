import { Injectable, signal } from '@angular/core';
import { ApiError } from './api-error';
import { Host } from './api.models';

/**
 * Serviço de autenticação do anfitrião.
 *
 * IMPORTANTE: o contrato do backend para contas de anfitrião ainda **não está
 * confirmado**. Este serviço devolve dados simulados (mock) para que as telas
 * de autenticação funcionem sem inventar campos, URLs ou formatos de resposta.
 *
 * Quando o contrato existir, cada método deve passar a chamar o `ApiClient`
 * (ver histórico em git) mantendo as assinaturas públicas usadas por
 * `auth.guard.ts` e `settings.page.ts`. Os marcadores `TODO: contrato não
 * confirmado` assinalam exactamente esses pontos.
 */

export interface RegistrationCodeResponse {
  status: 'accepted';
  email: string;
  expires_at: string;
  resend_available_at: string;
}

export type SocialProvider = 'google' | 'facebook';

const SOCIAL_LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
};

/** Email que o mock recusa (pedido de código / login), espelhando o protótipo. */
const REJECTED_EMAIL_SUFFIX = '@invalido.test';
/** Código OTP que o mock considera inválido, espelhando o protótipo. */
const REJECTED_OTP = '000000';
/** Token de reposição que o mock considera expirado, espelhando o protótipo. */
const EXPIRED_RESET_TOKEN = 'invalido';

function delay(ms = 450): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isoIn(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function buildMockHost(email: string): Host {
  const displayName = email.split('@')[0] || 'Anfitrião';
  return {
    id: 'mock-host',
    email,
    email_verified: true,
    status: 'active',
    profile: {
      display_name: displayName,
      phone: null,
      // A data de nascimento é pedida depois, nas configurações de perfil.
      birth_date: null,
      locale: 'pt-AO',
      timezone: 'Africa/Luanda',
      avatar_url: null,
    },
    profile_complete: false,
    missing_fields: ['birth_date'],
    created_at: new Date().toISOString(),
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly hostState = signal<Host | null>(null);
  private readonly readyState = signal(false);

  readonly host = this.hostState.asReadonly();
  readonly ready = this.readyState.asReadonly();
  /** Token devolvido pela verificação do código, usado no passo seguinte do registo. */
  readonly verificationToken = signal<string | null>(null);

  /**
   * Devolve o anfitrião com sessão, ou `null`.
   * TODO: contrato não confirmado — trocar por `GET /auth/session`.
   */
  async restoreSession(): Promise<Host | null> {
    this.readyState.set(true);
    return this.hostState();
  }

  /**
   * TODO: contrato não confirmado — trocar por `POST /auth/login`.
   * O mock aceita qualquer credencial; só recusa emails `@invalido.test`.
   */
  async login(email: string, password: string, remember = false): Promise<Host> {
    void remember; // TODO: contrato não confirmado — persistência de sessão.
    void password;
    await delay();
    const normalized = email.trim();
    if (normalized.toLowerCase().endsWith(REJECTED_EMAIL_SUFFIX)) {
      throw new ApiError(401, 'invalid_credentials', 'Email ou senha incorretos.');
    }
    const host = buildMockHost(normalized);
    this.hostState.set(host);
    this.readyState.set(true);
    return host;
  }

  /**
   * Passo 1 do registo: pede o envio do código.
   * TODO: contrato não confirmado — trocar por `POST /auth/register/request-code`.
   */
  async requestRegistrationCode(email: string): Promise<RegistrationCodeResponse> {
    await delay();
    const normalized = email.trim();
    if (normalized.toLowerCase().endsWith(REJECTED_EMAIL_SUFFIX)) {
      throw new ApiError(
        400,
        'email_rejected',
        'Não conseguimos enviar o código para este email. Usa outro email.',
      );
    }
    return {
      status: 'accepted',
      email: normalized,
      expires_at: isoIn(600),
      resend_available_at: isoIn(45),
    };
  }

  /**
   * Passo 2 do registo: confirma o código e guarda o token de verificação.
   * TODO: contrato não confirmado — trocar por `POST /auth/register/verify-code`.
   */
  async verifyRegistrationCode(email: string, code: string): Promise<void> {
    void email;
    await delay();
    if (code === REJECTED_OTP) {
      throw new ApiError(
        422,
        'verification_invalid',
        'Código incorreto ou expirado. Tenta outra vez.',
      );
    }
    this.verificationToken.set('mock-verification-token');
  }

  /**
   * Passo 3 do registo: cria a conta.
   * TODO: contrato não confirmado — trocar por `POST /auth/register`.
   */
  async register(email: string, password: string, displayName: string): Promise<void> {
    void password;
    void displayName;
    await delay();
    if (!this.verificationToken()) {
      throw new ApiError(
        422,
        'verification_required',
        'Confirma o código antes de criar a conta.',
      );
    }
    this.verificationToken.set(null);
    void email;
  }

  /**
   * Pede o link de reposição. Nunca revela se o email existe.
   * TODO: contrato não confirmado — trocar por `POST /auth/password/forgot`.
   */
  async requestPasswordReset(email: string): Promise<void> {
    void email;
    await delay();
  }

  /**
   * Define a nova senha a partir do token do link.
   * TODO: contrato não confirmado — trocar por `POST /auth/password/reset`.
   * TODO: contrato não confirmado — nome do parâmetro do token no link.
   */
  async resetPassword(token: string, password: string): Promise<void> {
    void password;
    await delay();
    if (!token.trim() || token === EXPIRED_RESET_TOKEN) {
      throw new ApiError(422, 'reset_invalid', 'Este link já não é válido. Pede um novo.');
    }
  }

  /**
   * Altera a senha do anfitrião autenticado.
   * TODO: contrato não confirmado — trocar por `POST /auth/password/change`.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    void currentPassword;
    void newPassword;
    await delay();
  }

  /**
   * Inicia a autenticação social.
   * TODO: contrato não confirmado — iniciar OAuth Google/Facebook.
   */
  async loginWithProvider(provider: SocialProvider): Promise<void> {
    await delay();
    throw new ApiError(
      501,
      'provider_not_configured',
      `A entrada com ${SOCIAL_LABELS[provider]} ainda não está disponível.`,
    );
  }

  /**
   * Termina a sessão.
   * TODO: contrato não confirmado — trocar por `POST /auth/logout`.
   */
  async logout(): Promise<void> {
    await delay();
    this.hostState.set(null);
    this.verificationToken.set(null);
    this.readyState.set(true);
  }
}
