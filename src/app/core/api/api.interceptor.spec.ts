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
    const subscription = http
      .get('http://localhost:3000/api/v1/auth/session')
      .subscribe();
    const request = controller.expectOne('http://localhost:3000/api/v1/auth/session');

    expect(request.request.headers.get('Cookie')).toBe('apupu_auth=session-token');
    request.flush({ data: {} });
    subscription.unsubscribe();
    controller.verify();
  });
});
