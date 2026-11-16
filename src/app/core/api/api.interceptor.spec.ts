import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { CsrfTokenStore } from './api.interceptor';

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
