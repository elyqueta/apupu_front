import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-config';
import { ApiError } from './api-error';
import { apiErrorInterceptor, apiRequestInterceptor } from './api.interceptor';
import { Host } from './api.models';
import { AuthService } from './auth.service';

const BASE = 'http://localhost:3000/api/v1';

function hostFixture(overrides: Partial<Host> = {}): Host {
  return {
    id: 'host-1',
    email: 'ana@exemplo.pt',
    email_verified: true,
    status: 'active',
    profile: {
      display_name: 'Ana',
      phone: null,
      birth_date: null,
      locale: 'pt-PT',
      timezone: 'Africa/Luanda',
      avatar_url: null,
    },
    profile_complete: true,
    missing_fields: [],
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiRequestInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts with no session and becomes ready only after a session check', async () => {
    expect(service.host()).toBeNull();
    expect(service.ready()).toBe(false);

    const restore = service.restoreSession();
    const request = http.expectOne(`${BASE}/auth/session`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: { host: hostFixture(), csrf_token: 'csrf-1' } });

    expect((await restore)?.id).toBe('host-1');
    expect(service.ready()).toBe(true);
  });

  it('requests a registration code and returns its availability window', async () => {
    const promise = service.requestRegistrationCode('ana@exemplo.pt');
    const request = http.expectOne(`${BASE}/auth/register/request-code`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ana@exemplo.pt' });
    request.flush({
      data: {
        status: 'accepted',
        email: 'ana@exemplo.pt',
        expires_at: '2026-01-01T00:10:00Z',
        resend_available_at: '2026-01-01T00:01:00Z',
      },
    });

    const response = await promise;
    expect(response.status).toBe('accepted');
    expect(response.resend_available_at).toBe('2026-01-01T00:01:00Z');
  });

  it('stores the verification token returned by the code step', async () => {
    const promise = service.verifyRegistrationCode('ana@exemplo.pt', '123456');
    const request = http.expectOne(`${BASE}/auth/register/verify-code`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ana@exemplo.pt', code: '123456' });
    request.flush({
      data: {
        email: 'ana@exemplo.pt',
        verification_token: 'verify-token',
        expires_at: '2026-01-01T00:10:00Z',
      },
    });

    await promise;
    expect(service.verificationToken()).toBe('verify-token');
  });

  it('registers and starts the session automatically, without a separate login', async () => {
    service.verificationToken.set('verify-token');

    const promise = service.register('ana@exemplo.pt', 'segredo123', 'Ana');
    const request = http.expectOne(`${BASE}/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'ana@exemplo.pt',
      password: 'segredo123',
      display_name: 'Ana',
      verification_token: 'verify-token',
    });
    request.flush({
      data: { host: hostFixture(), csrf_token: 'csrf-1', expires_at: '2026-02-01T00:00:00Z' },
    });

    const host = await promise;
    expect(host.id).toBe('host-1');
    expect(service.host()?.id).toBe('host-1');
    expect(service.ready()).toBe(true);
    // O token de verificação é de uso único e é limpo depois do registo.
    expect(service.verificationToken()).toBeNull();
  });

  it('reuses the registered session on later restores without another request', async () => {
    service.verificationToken.set('verify-token');
    const promise = service.register('ana@exemplo.pt', 'segredo123', 'Ana');
    http.expectOne(`${BASE}/auth/register`).flush({
      data: { host: hostFixture(), csrf_token: 'csrf-1', expires_at: '2026-02-01T00:00:00Z' },
    });
    await promise;

    expect(await service.restoreSession()).toEqual(hostFixture());
    http.expectNone(`${BASE}/auth/session`);
  });

  it('refuses to register without a verification token and sends nothing', async () => {
    await expect(service.register('ana@exemplo.pt', 'segredo123', 'Ana')).rejects.toMatchObject({
      status: 422,
      code: 'verification_required',
    });
    expect(service.host()).toBeNull();
    http.expectNone(`${BASE}/auth/register`);
  });

  it('keeps the current login behaviour and starts the session', async () => {
    const promise = service.login('ana@exemplo.pt', 'segredo123');
    const request = http.expectOne(`${BASE}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ana@exemplo.pt', password: 'segredo123' });
    request.flush({
      data: { host: hostFixture(), csrf_token: 'csrf-1', expires_at: '2026-02-01T00:00:00Z' },
    });

    expect((await promise).id).toBe('host-1');
    expect(service.host()?.id).toBe('host-1');
    expect(service.ready()).toBe(true);
  });

  it('propagates flow errors and keeps the session empty', async () => {
    const promise = service.login('ana@exemplo.pt', 'errada');
    http.expectOne(`${BASE}/auth/login`).flush(
      {
        error: {
          code: 'invalid_credentials',
          message: 'Email ou senha inválidos.',
          request_id: 'req-1',
        },
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 401,
      code: 'invalid_credentials',
      message: 'Email ou senha inválidos.',
    });
    expect(service.host()).toBeNull();
    expect(service.ready()).toBe(false);
  });

  it('treats a missing session as signed out and caches the result', async () => {
    const restore = service.restoreSession();
    http
      .expectOne(`${BASE}/auth/session`)
      .flush(
        { error: { code: 'unauthenticated', message: 'Sem sessão.', request_id: 'req-2' } },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(await restore).toBeNull();
    expect(service.ready()).toBe(true);
    expect(await service.restoreSession()).toBeNull();
    http.expectNone(`${BASE}/auth/session`);
  });

  it('clears the session on logout', async () => {
    const login = service.login('ana@exemplo.pt', 'segredo123');
    http.expectOne(`${BASE}/auth/login`).flush({
      data: { host: hostFixture(), csrf_token: 'csrf-1', expires_at: '2026-02-01T00:00:00Z' },
    });
    await login;

    const logout = service.logout();
    const request = http.expectOne(`${BASE}/auth/logout`);
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await logout;

    expect(service.host()).toBeNull();
    expect(service.ready()).toBe(true);
  });

  it('posts the password reset token and new password', async () => {
    const promise = service.resetPassword('reset-token', 'novaSenha123');
    const request = http.expectOne(`${BASE}/auth/password/reset`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ token: 'reset-token', password: 'novaSenha123' });
    request.flush(null, { status: 204, statusText: 'No Content' });

    await expect(promise).resolves.toBeUndefined();
  });
});
