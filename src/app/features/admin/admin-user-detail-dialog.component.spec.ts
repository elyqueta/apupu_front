import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/api/api-config';
import { DownloadService } from '../../core/services/download.service';
import { mapAdminUserDetail } from './admin.models';
import { AdminUserDetailDialogComponent } from './admin-user-detail-dialog.component';

const BASE = 'http://localhost:3000/api/v1';
const USER_ID = '11111111-1111-1111-1111-111111111111';

function detailFixture(empty = false) {
  return {
    id: USER_ID,
    email: 'ana@example.com',
    display_name: 'Ana Silva',
    role: 'host',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    events_created: empty ? 0 : 1,
    avatar_url: 'https://res.cloudinary.com/demo/image/upload/avatar.png',
    cover_url: 'https://res.cloudinary.com/demo/image/upload/cover.jpg',
    phone: '+244923000000',
    birth_date: '1990-05-20',
    locale: 'pt-AO',
    timezone: 'Africa/Luanda',
    email_verified_at: '2026-01-02T00:00:00Z',
    profile_complete: true,
    events: empty
      ? []
      : [
          {
            id: 'event-1',
            title: 'Casamento da Ana',
            status: 'scheduled',
            starts_at: '2026-06-20T15:00:00Z',
            created_at: '2026-01-01T00:00:00Z',
            guest_count: 12,
          },
        ],
    teams: empty
      ? []
      : [
          {
            id: 'team-1',
            name: 'Decoração',
            member_count: 4,
            event_title: 'Casamento da Ana',
          },
        ],
  };
}

async function tick(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function settle(fixture: ComponentFixture<AdminUserDetailDialogComponent>): Promise<void> {
  await tick();
  await fixture.whenStable();
  fixture.detectChanges();
}

function setup(): {
  fixture: ComponentFixture<AdminUserDetailDialogComponent>;
  http: HttpTestingController;
} {
  TestBed.configureTestingModule({
    imports: [AdminUserDetailDialogComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  return {
    fixture: TestBed.createComponent(AdminUserDetailDialogComponent),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('AdminUserDetailDialogComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    try {
      http?.verify();
    } finally {
      TestBed.resetTestingModule();
      vi.restoreAllMocks();
    }
  });

  it('mostra capa, avatar, eventos e equipas com o estilo de perfil', async () => {
    const context = setup();
    http = context.http;
    context.fixture.componentRef.setInput('open', true);
    context.fixture.componentRef.setInput(
      'user',
      mapAdminUserDetail(detailFixture()),
    );
    await settle(context.fixture);

    const root: HTMLElement = context.fixture.nativeElement;
    expect(root.querySelector('[data-testid="app-modal"]')).toBeTruthy();
    expect(
      root.querySelector('[data-testid="admin-user-cover-image"]')?.getAttribute('src'),
    ).toBe('https://res.cloudinary.com/demo/image/upload/cover.jpg');
    expect(
      root.querySelector('[data-testid="admin-user-avatar"] app-avatar img')?.getAttribute('src'),
    ).toBe('https://res.cloudinary.com/demo/image/upload/avatar.png');
    expect(root.querySelector('[data-testid="admin-user-events"]')?.textContent).toContain(
      'Casamento da Ana',
    );
    expect(root.querySelector('[data-testid="admin-user-teams"]')?.textContent).toContain(
      'Decoração',
    );
    context.fixture.destroy();
  });

  it('mostra estados vazios quando o perfil não tem eventos nem equipas', async () => {
    const context = setup();
    http = context.http;
    context.fixture.componentRef.setInput('open', true);
    context.fixture.componentRef.setInput(
      'user',
      mapAdminUserDetail(detailFixture(true)),
    );
    await settle(context.fixture);

    const root: HTMLElement = context.fixture.nativeElement;
    expect(root.querySelector('[data-testid="admin-user-no-events"]')?.textContent).toContain(
      'ainda não criou eventos',
    );
    expect(root.querySelector('[data-testid="admin-user-no-teams"]')?.textContent).toContain(
      'não tem equipas associadas',
    );
    context.fixture.destroy();
  });

  it('exporta o PDF do perfil e guarda o nome devolvido pela API', async () => {
    const context = setup();
    http = context.http;
    const save = vi.spyOn(TestBed.inject(DownloadService), 'save');
    context.fixture.componentRef.setInput('open', true);
    context.fixture.componentRef.setInput(
      'user',
      mapAdminUserDetail(detailFixture()),
    );
    await settle(context.fixture);

    const root: HTMLElement = context.fixture.nativeElement;
    const button = root.querySelector<HTMLButtonElement>(
      '[data-testid="admin-user-export-pdf"]',
    );
    expect(button?.disabled).toBe(false);
    button?.click();

    const request = http.expectOne(
      (req) => req.url === `${BASE}/admin/users/${USER_ID}/report`,
    );
    expect(request.request.method).toBe('GET');
    request.flush(new Blob(['%PDF-'], { type: 'application/pdf' }), {
      headers: new HttpHeaders({
        'Content-Disposition': 'attachment; filename="conto-contigo_perfil_ana-silva.pdf"',
      }),
    });
    await settle(context.fixture);

    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0].filename).toBe('conto-contigo_perfil_ana-silva.pdf');
    expect(save.mock.calls[0][1]).toBe('conto-contigo_perfil.pdf');
    context.fixture.destroy();
  });
});
