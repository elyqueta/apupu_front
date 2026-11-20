import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { Host } from '../../core/api/api.models';
import { AuthService } from '../../core/api/auth.service';
import { AdminUsersComponent } from './admin-users.component';

const BASE = 'http://localhost:3000/api/v1';
const SELF_ID = 'host-self';
const OTHER_ID = 'host-other';

function sessionHost(): Host {
  return {
    id: SELF_ID,
    email: 'admin@example.com',
    email_verified: true,
    status: 'active',
    profile: {
      display_name: 'Admin',
      phone: null,
      birth_date: null,
      locale: 'pt-AO',
      timezone: 'Africa/Luanda',
      avatar_url: null,
      cover_url: null,
    },
    profile_complete: true,
    missing_fields: [],
    created_at: '2026-01-01T00:00:00Z',
  };
}

function userFixture(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    email: id === SELF_ID ? 'admin@example.com' : 'outro@example.com',
    display_name: id === SELF_ID ? 'Admin' : 'Outro Utilizador',
    role: 'super_admin',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    events_created: 3,
    ...overrides,
  };
}

function pageOf(data: unknown[]) {
  return {
    data,
    pagination: { page: 1, page_size: 10, total: data.length, total_pages: 1 },
  };
}

async function tick(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function settle(fixture: ComponentFixture<AdminUsersComponent>): Promise<void> {
  await tick();
  await fixture.whenStable();
  fixture.detectChanges();
}

function setup(): { fixture: ComponentFixture<AdminUsersComponent>; http: HttpTestingController } {
  TestBed.configureTestingModule({
    imports: [AdminUsersComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
      {
        provide: AuthService,
        useValue: {
          host: signal(sessionHost()),
          restoreSession: vi.fn().mockResolvedValue(sessionHost()),
        },
      },
    ],
  });
  return {
    fixture: TestBed.createComponent(AdminUsersComponent),
    http: TestBed.inject(HttpTestingController),
  };
}

function flushUsers(http: HttpTestingController): void {
  const request = http.expectOne((req) => req.url === `${BASE}/admin/users`);
  expect(request.request.params.get('page')).toBe('1');
  expect(request.request.params.get('page_size')).toBe('10');
  request.flush(pageOf([userFixture(SELF_ID), userFixture(OTHER_ID)]));
}

describe('AdminUsersComponent', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http?.verify();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('bloqueia suspensão e alteração de papel na própria conta', async () => {
    const context = setup();
    http = context.http;
    context.fixture.detectChanges();
    await settle(context.fixture);
    flushUsers(http);
    await settle(context.fixture);

    const selfCard: HTMLElement = context.fixture.nativeElement.querySelector(
      `[data-testid="admin-user-card-${SELF_ID}"]`,
    );
    const suspend = selfCard.querySelector<HTMLButtonElement>('[data-testid="admin-user-suspend"]');
    expect(suspend?.disabled).toBe(true);
    expect(suspend?.getAttribute('title')).toContain('própria conta');
    expect(selfCard.querySelector('[data-testid="admin-user-change-role"]')).toBeTruthy();
    expect(
      selfCard.querySelector<HTMLButtonElement>('[data-testid="admin-user-change-role"]')?.disabled,
    ).toBe(true);

    suspend?.click();
    context.fixture.detectChanges();
    expect(
      context.fixture.nativeElement.querySelector('app-confirm-dialog app-modal [data-testid="app-modal"]'),
    ).toBeFalsy();
    http.expectNone((req) => req.method === 'POST' && req.url.includes('/suspend'));
    context.fixture.destroy();
  });

  it('pede confirmação e suspende outra conta', async () => {
    const context = setup();
    http = context.http;
    context.fixture.detectChanges();
    await settle(context.fixture);
    flushUsers(http);
    await settle(context.fixture);

    const otherCard: HTMLElement = context.fixture.nativeElement.querySelector(
      `[data-testid="admin-user-card-${OTHER_ID}"]`,
    );
    const suspend = otherCard.querySelector<HTMLButtonElement>('[data-testid="admin-user-suspend"]');
    expect(suspend?.disabled).toBe(false);
    suspend?.click();
    context.fixture.detectChanges();
    expect(
      context.fixture.nativeElement.querySelector('app-confirm-dialog app-modal [data-testid="app-modal"]'),
    ).toBeTruthy();

    const root: HTMLElement = context.fixture.nativeElement;
    const confirm = root.querySelector<HTMLButtonElement>(
      'app-confirm-dialog [data-testid="app-modal-footer"] button:last-child',
    );
    confirm?.click();
    const request = http.expectOne(
      (req) => req.url === `${BASE}/admin/users/${OTHER_ID}/suspend`,
    );
    expect(request.request.method).toBe('POST');
    request.flush({ data: null });
    await settle(context.fixture);
    const reload = http.expectOne((req) => req.url === `${BASE}/admin/users`);
    reload.flush(
      pageOf([userFixture(SELF_ID), userFixture(OTHER_ID, { status: 'suspended' })]),
    );
    await settle(context.fixture);
    context.fixture.destroy();
  });
});
