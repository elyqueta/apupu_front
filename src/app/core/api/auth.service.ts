import { Injectable, inject, signal } from '@angular/core';
import { ApiClient } from './api-client';
import { ApiError } from './api-error';
import { CsrfTokenStore } from './api.interceptor';
import { Host } from './api.models';

interface SessionResponse {
  host: Host;
  csrf_token: string;
}

interface LoginResponse extends SessionResponse {
  expires_at: string;
}

export interface RegistrationCodeResponse {
  status: 'accepted';
  email: string;
  expires_at: string;
  resend_available_at: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly csrf = inject(CsrfTokenStore);
  private restorePromise: Promise<Host | null> | null = null;

  private readonly hostState = signal<Host | null>(null);
  private readonly readyState = signal(false);

  readonly host = this.hostState.asReadonly();
  readonly ready = this.readyState.asReadonly();
  readonly verificationToken = signal<string | null>(null);

  async restoreSession(): Promise<Host | null> {
    if (this.readyState()) {
      return this.hostState();
    }
    if (this.restorePromise) {
      return this.restorePromise;
    }
    this.restorePromise = this.api
      .get<SessionResponse>('/auth/session')
      .then((session) => {
        this.setSession(session);
        return session.host;
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          this.clearSession();
          return null;
        }
        throw error;
      })
      .finally(() => {
        this.readyState.set(true);
        this.restorePromise = null;
      });
    return this.restorePromise;
  }

  async login(email: string, password: string): Promise<Host> {
    const session = await this.api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    this.setSession(session);
    return session.host;
  }

  requestRegistrationCode(email: string): Promise<RegistrationCodeResponse> {
    return this.api.post('/auth/register/request-code', { email });
  }

  async verifyRegistrationCode(email: string, code: string): Promise<void> {
    const response = await this.api.post<{ verification_token: string }>(
      '/auth/register/verify-code',
      { email, code },
    );
    this.verificationToken.set(response.verification_token);
  }

  async register(email: string, password: string, displayName: string): Promise<void> {
    const verificationToken = this.verificationToken();
    if (!verificationToken) {
      throw new ApiError(422, 'verification_required', 'Verifica o email antes de criar a conta.');
    }
    await this.api.post('/auth/register', {
      email,
      password,
      display_name: displayName || undefined,
      verification_token: verificationToken,
    });
    this.verificationToken.set(null);
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.api.post('/auth/password/forgot', { email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.api.postNoContent('/auth/password/reset', { token, password });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.api.postNoContent('/auth/password/change', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  async logout(): Promise<void> {
    await this.api.postNoContent('/auth/logout');
    this.clearSession();
  }

  private setSession(session: SessionResponse): void {
    this.hostState.set(session.host);
    this.csrf.set(session.csrf_token, '/auth/session');
    this.readyState.set(true);
  }

  private clearSession(): void {
    this.hostState.set(null);
    this.csrf.set(null, '/auth/session');
    this.verificationToken.set(null);
    this.readyState.set(true);
  }
}
