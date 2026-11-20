import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, REQUEST } from '@angular/core';
import { API_BASE_URL } from './api-config';
import { apiRequestInterceptor, CsrfTokenStore } from './api.interceptor';
import { ApiClient } from './api-client';

describe('CsrfTokenStore', () => {
  it('does not read browser cookies during server rendering', () => {
    let cookieReads = 0;
    const serverDocument = Object.defineProperty({}, 'cookie', {
      get: () => {
        cookieReads += 1;
        return '';
      },
    });

    TestBed.configureTestingModule({
      providers: [
        CsrfTokenStore,
        { provide: DOCUMENT, useValue: serverDocument },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    expect(TestBed.inject(CsrfTokenStore).get('https://api.example/api/v1/auth/logout')).toBeNull();
    expect(cookieReads).toBe(0);
  });
});

describe('apiRequestInterceptor', () => {
  it('forwards the auth cookie during SSR only to the same API host', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiRequestInterceptor])),
        provideHttpClientTesting(),
        {
          provide: REQUEST,
          useValue: new Request('http://localhost:4200/painel', {
            headers: { cookie: 'apupu_auth=session-token; unrelated=value' },
          }),
        },
        { provide: API_BASE_URL, useValue: 'http://localhost:3000/api/v1' },
      ],
    });

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const subscription = http.get('http://localhost:3000/api/v1/auth/session').subscribe();
    const request = controller.expectOne('http://localhost:3000/api/v1/auth/session');

    expect(request.request.headers.get('Cookie')).toBe('apupu_auth=session-token');
    request.flush({ data: {} });
    subscription.unsubscribe();
    controller.verify();
  });

  it('forwards the auth cookie when API and request URLs are relative (Vercel)', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiRequestInterceptor])),
        provideHttpClientTesting(),
        {
          provide: REQUEST,
          useValue: new Request('https://apupu-front.vercel.app/painel', {
            headers: { cookie: 'apupu_auth=session-token' },
          }),
        },
        { provide: API_BASE_URL, useValue: '/api/v1' },
      ],
    });

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const subscription = http.get('/api/v1/auth/session').subscribe();
    const request = controller.expectOne('/api/v1/auth/session');

    expect(request.request.headers.get('Cookie')).toBe('apupu_auth=session-token');
    request.flush({ data: {} });
    subscription.unsubscribe();
    controller.verify();
  });
});

describe('CsrfTokenStore · account session', () => {
  function storeWithCookie(cookie: string): CsrfTokenStore {
    TestBed.configureTestingModule({
      providers: [
        CsrfTokenStore,
        { provide: DOCUMENT, useValue: { cookie } },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    return TestBed.inject(CsrfTokenStore);
  }

  it('uses the account token returned by the API for an event scope', () => {
    const store = storeWithCookie('apupu_csrf_auth=account-token');
    store.set('response-token', '/auth/login');
    expect(store.get('http://localhost:3000/api/v1/host/events/evt-1/invitations')).toBe(
      'response-token',
    );
  });

  it('does not use the account CSRF cookie without a token from the API', () => {
    const store = storeWithCookie('apupu_csrf_auth=stale-cookie-token');
    expect(store.get('http://localhost:3000/api/v1/host/events')).toBeNull();
  });

  it('prefers a manage-session token over the account token', () => {
    const store = storeWithCookie(
      'apupu_csrf_auth=account-token; apupu_csrf_host_evt-1=manage-token',
    );
    expect(store.get('http://localhost:3000/api/v1/host/events/evt-1/invitations')).toBe(
      'manage-token',
    );
  });

  it('reuses a cached account token without reading cookies', () => {
    const store = storeWithCookie('');
    store.set('cached-account-token', '/auth/login');
    expect(store.get('http://localhost:3000/api/v1/host/events/evt-1/invitations')).toBe(
      'cached-account-token',
    );
  });
});

describe('apiRequestInterceptor · authenticated event creation', () => {
  function configure(cookie: string): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiRequestInterceptor])),
        provideHttpClientTesting(),
        { provide: DOCUMENT, useValue: { cookie } },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: API_BASE_URL, useValue: 'http://localhost:3000/api/v1' },
      ],
    });
  }

  it('sends credentials and the current login CSRF token when creating an event', async () => {
    configure('apupu_csrf_auth=stale-cookie-token');
    const api = TestBed.inject(ApiClient);
    const controller = TestBed.inject(HttpTestingController);
    const login = api.post<{ csrf_token: string }>('/auth/login', {});
    const loginRequest = controller.expectOne('http://localhost:3000/api/v1/auth/login');
    expect(loginRequest.request.withCredentials).toBe(true);
    loginRequest.flush({ data: { csrf_token: 'login-token' } });
    await login;

    const create = api.post('/host/events', { event: { title: 'Evento' }, guests: [] });
    const request = controller.expectOne('http://localhost:3000/api/v1/host/events');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-CSRF-Token')).toBe('login-token');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.withCredentials).toBe(true);
    request.flush({ data: { event: { id: 'evt-1' } } });
    await create;
    controller.verify();
  });

  it('sends the account CSRF token on admin writes', async () => {
    configure('');
    const api = TestBed.inject(ApiClient);
    const controller = TestBed.inject(HttpTestingController);

    const login = api.post('/auth/login', {});
    controller.expectOne('http://localhost:3000/api/v1/auth/login').flush({
      data: { csrf_token: 'admin-token' },
    });
    await login;

    const suspend = api.post('/admin/users/host-1/suspend', {});
    const request = controller.expectOne(
      'http://localhost:3000/api/v1/admin/users/host-1/suspend',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-CSRF-Token')).toBe('admin-token');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ data: null });
    await suspend;
    controller.verify();
  });

  it('refreshes a stale CSRF token from the current auth session before event creation', async () => {
    configure('');
    const api = TestBed.inject(ApiClient);
    const controller = TestBed.inject(HttpTestingController);

    const login = api.post('/auth/login', {});
    controller.expectOne('http://localhost:3000/api/v1/auth/login').flush({
      data: { csrf_token: 'old-token' },
    });
    await login;

    const restore = api.get('/auth/session');
    const sessionRequest = controller.expectOne('http://localhost:3000/api/v1/auth/session');
    expect(sessionRequest.request.withCredentials).toBe(true);
    sessionRequest.flush({ data: { csrf_token: 'current-token' } });
    await restore;

    const create = api.post('/host/events', { event: { title: 'Evento' }, guests: [] });
    const request = controller.expectOne('http://localhost:3000/api/v1/host/events');
    expect(request.request.headers.get('X-CSRF-Token')).toBe('current-token');
    request.flush({ data: { event: { id: 'evt-1' } } });
    await create;
    controller.verify();
  });

  it('does not invent a CSRF token when no auth response has supplied one', async () => {
    configure('apupu_csrf_auth=stale-cookie-token');
    const api = TestBed.inject(ApiClient);
    const controller = TestBed.inject(HttpTestingController);

    const create = api.post('/host/events', { event: { title: 'Evento' }, guests: [] });
    const request = controller.expectOne('http://localhost:3000/api/v1/host/events');
    expect(request.request.headers.has('X-CSRF-Token')).toBe(false);
    expect(request.request.withCredentials).toBe(true);
    request.flush({ data: { event: { id: 'evt-1' } } });
    await create;
    controller.verify();
  });

  it('still uses the manage-session token when the legacy flow set one', () => {
    configure('apupu_csrf_host_evt-1=manage-token');
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const subscription = http
      .post('http://localhost:3000/api/v1/host/events/evt-1/invitations', {
        name: 'Rui',
        email: 'rui@exemplo.pt',
      })
      .subscribe();
    const request = controller.expectOne(
      'http://localhost:3000/api/v1/host/events/evt-1/invitations',
    );

    expect(request.request.headers.get('X-CSRF-Token')).toBe('manage-token');
    request.flush({ data: { id: 'inv-1' } });
    subscription.unsubscribe();
    controller.verify();
  });
});
