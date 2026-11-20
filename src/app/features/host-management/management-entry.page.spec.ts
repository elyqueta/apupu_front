import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-config';
import { ApiEvent } from '../../core/api/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { ManagementEntryPage } from './management-entry.page';

const BASE = 'http://localhost:3000/api/v1';
const TOKEN = 'secret-management-token-with-at-least-20-chars';
const EVENT_ID = '11111111-1111-1111-1111-111111111111';

interface SessionData {
  event: ApiEvent;
  role: 'host' | 'manager';
  access_role: 'host' | 'manager';
  email: string | null;
  email_has_account: boolean;
  csrf_token: string;
  expires_at: string;
}

function sessionFixture(overrides: Partial<SessionData> = {}): SessionData {
  return {
    event: { id: EVENT_ID } as ApiEvent,
    role: 'manager',
    access_role: 'manager',
    email: 'gestor@exemplo.pt',
    email_has_account: true,
    csrf_token: 'csrf-1',
    expires_at: '2026-11-21T00:00:00Z',
    ...overrides,
  };
}

function errorBody(code: string) {
  return {
    error: { code, message: code, request_id: 'req-1' },
  };
}

interface Setup {
  fixture: ComponentFixture<ManagementEntryPage>;
  http: HttpTestingController;
  navigate: ReturnType<typeof vi.spyOn>;
}

function setup(): Setup {
  TestBed.configureTestingModule({
    imports: [ManagementEntryPage],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({ token: TOKEN })) },
      },
    ],
  });

  const http = TestBed.inject(HttpTestingController);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ManagementEntryPage);
  fixture.detectChanges();
  return { fixture, http, navigate };
}

async function settle(fixture: ComponentFixture<ManagementEntryPage>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

function typeCode(fixture: ComponentFixture<ManagementEntryPage>, value: string): void {
  const input = fixture.nativeElement.querySelector('[data-testid="access-code"]') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

function expectedError(): string {
  return TestBed.inject(I18nService).t('management.accessFailed');
}

describe('ManagementEntryPage', () => {
  let http: HttpTestingController;

  afterEach(() => {
    TestBed.resetTestingModule();
    http?.verify();
    vi.restoreAllMocks();
  });

  it('normaliza o código para maiúsculas sem espaços nem hífenes', async () => {
    const context = setup();
    http = context.http;

    typeCode(context.fixture, ' ab-c 12 3x ');

    const input = context.fixture.nativeElement.querySelector(
      '[data-testid="access-code"]',
    ) as HTMLInputElement;
    expect(input.value).toBe('ABC123');
    await settle(context.fixture);
  });

  it('troca token e código pela sessão e abre a gestão do evento', async () => {
    const context = setup();
    http = context.http;

    typeCode(context.fixture, 'ab-c123');
    (context.fixture.nativeElement.querySelector('[data-testid="access-submit"]') as HTMLButtonElement).click();

    const request = http.expectOne(`${BASE}/public/manage/access`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ token: TOKEN, code: 'ABC123' });
    request.flush({ data: sessionFixture() });
    await settle(context.fixture);

    expect(context.navigate).toHaveBeenCalledWith(['/gestao/evento', EVENT_ID], {
      replaceUrl: true,
    });
  });

  it('mostra sempre o mesmo erro genérico, sem motivo, em qualquer falha', async () => {
    const context = setup();
    http = context.http;
    const native = context.fixture.nativeElement as HTMLElement;

    // Formato inválido: nem chega a pedir ao servidor.
    typeCode(context.fixture, 'A1');
    (native.querySelector('[data-testid="access-submit"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();
    const invalid = native.querySelector('[data-testid="access-error"]') as HTMLElement;
    expect(invalid.textContent).toContain(expectedError());
    expect(invalid.textContent).not.toContain('6 caracteres');
    expect(http.match(() => true).length).toBe(0);

    const attempts: { body: Record<string, unknown>; status: number; code: string }[] = [
      {
        body: errorBody('access_code_invalid'),
        status: 403,
        code: 'ABC124',
      },
      {
        body: errorBody('host_session_locked'),
        status: 403,
        code: 'ABC125',
      },
      {
        body: errorBody('internal_error'),
        status: 500,
        code: 'ABC126',
      },
    ];

    for (const attempt of attempts) {
      typeCode(context.fixture, attempt.code);
      (native.querySelector('[data-testid="access-submit"]') as HTMLButtonElement).click();
      const request = http.expectOne(`${BASE}/public/manage/access`);
      request.flush(attempt.body, {
        status: attempt.status,
        statusText: attempt.status === 403 ? 'Forbidden' : 'Server Error',
      });
      await settle(context.fixture);

      const error = native.querySelector('[data-testid="access-error"]') as HTMLElement;
      expect(error.textContent?.trim()).toBe(expectedError());
      expect(error.textContent).not.toContain('bloque');
      expect(error.textContent).not.toContain('inválido');
    }

    expect(context.navigate).not.toHaveBeenCalled();
  });

  it('oferece o atalho de criação de conta ao gestor sem conta', async () => {
    const context = setup();
    http = context.http;
    const native = context.fixture.nativeElement as HTMLElement;

    typeCode(context.fixture, 'ABC123');
    (native.querySelector('[data-testid="access-submit"]') as HTMLButtonElement).click();
    const request = http.expectOne(`${BASE}/public/manage/access`);
    request.flush({ data: sessionFixture({ email_has_account: false }) });
    await settle(context.fixture);

    expect(context.navigate).not.toHaveBeenCalled();
    expect(native.querySelector('[data-testid="app-modal"]')).toBeTruthy();

    (native.querySelector('[data-testid="account-create"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();
    (native.querySelector('[data-testid="manager-register-same-email"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();

    expect(context.navigate).toHaveBeenCalledWith(['/criar-conta'], {
      queryParams: {
        email: 'gestor@exemplo.pt',
        gestor: 1,
        returnUrl: `/gestao/evento/${EVENT_ID}`,
      },
    });
  });
});
