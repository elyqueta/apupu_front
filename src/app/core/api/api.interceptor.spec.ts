import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, REQUEST } from '@angular/core';
import { API_BASE_URL } from './api-config';
import { apiRequestInterceptor, CsrfTokenStore } from './api.interceptor';

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

  it('falls back to the account CSRF token for an event scope', () => {
    const store = storeWithCookie('apupu_csrf_auth=account-token');
    expect(store.get('http://localhost:3000/api/v1/host/events/evt-1/invitations')).toBe(
      'account-token',
    );
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

describe('apiRequestInterceptor · guest creation with an account session', () => {
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

  it('sends the account CSRF token and credentials, without a manage token', () => {
    configure('apupu_csrf_auth=account-token');
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

    expect(request.request.headers.get('X-CSRF-Token')).toBe('account-token');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ name: 'Rui', email: 'rui@exemplo.pt' });
    request.flush({ data: { id: 'inv-1' } });
    subscription.unsubscribe();
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
