import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/api/api-config';
import { I18nService } from '../../core/i18n/i18n.service';
import { AdminOverviewComponent } from './admin-overview.component';
import { adminActionLabel, adminTargetLabel, mapAdminActivity } from './admin.models';

const BASE = 'http://localhost:3000/api/v1';

function overviewFixture() {
  return {
    stats: {
      users: 8,
      active_events: 3,
      cancelled_events: 1,
      invitations_sent: 24,
    },
    recent_activity: [
      {
        id: 'log-1',
        action: 'admin_all_users_report_exported',
        target_type: 'admin',
        target_id: '00000000-0000-4000-8000-000000000001',
        admin_name: 'Admin Geral',
        admin_email: 'admin@exemplo.ao',
        created_at: '2026-11-20T15:00:00Z',
      },
      {
        id: 'log-2',
        action: 'admin_user_suspended',
        target_type: 'host',
        target_id: 'host-2',
        admin_email: 'admin@exemplo.ao',
        created_at: '2026-11-20T14:00:00Z',
      },
    ],
  };
}

async function settle(fixture: ComponentFixture<AdminOverviewComponent>): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await fixture.whenStable();
  fixture.detectChanges();
}

function setup(): {
  fixture: ComponentFixture<AdminOverviewComponent>;
  http: HttpTestingController;
} {
  TestBed.configureTestingModule({
    imports: [AdminOverviewComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  return {
    fixture: TestBed.createComponent(AdminOverviewComponent),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('admin activity labels', () => {
  let i18n: I18nService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    i18n = TestBed.inject(I18nService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('describes every action written by the backend instead of showing raw keys', () => {
    expect(adminActionLabel('admin_all_users_report_exported', i18n)).toBe(
      'Relatório global exportado em PDF',
    );
    expect(adminActionLabel('support_message_resolved', i18n)).toBe(
      'Mensagem de apoio marcada como resolvida',
    );
    expect(adminActionLabel('admin_users_listed', i18n)).toBe(
      'Lista de utilizadores consultada',
    );
  });

  it('identifies unknown actions instead of hiding them', () => {
    expect(adminActionLabel('admin_nova_accao', i18n)).toBe(
      'Ação não identificada: admin_nova_accao',
    );
  });

  it('translates target types', () => {
    expect(adminTargetLabel('host', i18n)).toBe('Conta');
    expect(adminTargetLabel('support_message', i18n)).toBe('Apoio');
    expect(adminTargetLabel('', i18n)).toBe('Registo');
  });

  it('prefers the display name over the email for the actor', () => {
    const entry = mapAdminActivity({
      id: 'log-1',
      action: 'admin_user_suspended',
      admin_name: 'Admin Geral',
      admin_email: 'admin@exemplo.ao',
    });
    expect(entry.actor).toBe('Admin Geral');
  });
});

describe('AdminOverviewComponent · activity display', () => {
  let http: HttpTestingController;

  beforeEach(() => TestBed.resetTestingModule());

  afterEach(() => {
    try {
      http?.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  it('shows readable actions, the admin who performed them and the target', async () => {
    const context = setup();
    http = context.http;
    context.fixture.detectChanges();
    await settle(context.fixture);
    http.expectOne((req) => req.url === `${BASE}/admin/overview`).flush({
      data: overviewFixture(),
    });
    await settle(context.fixture);

    const root: HTMLElement = context.fixture.nativeElement;
    const action = root.querySelector('[data-testid="admin-overview-action-log-1"]');
    expect(action?.textContent).toContain('Relatório global exportado em PDF');

    const item = root.querySelector('[data-testid="admin-overview-activity-log-1"]');
    expect(item?.textContent).toContain('Por Admin Geral');
    expect(item?.textContent).toContain('Alvo: Administração');

    const withEmail = root.querySelector('[data-testid="admin-overview-activity-log-2"]');
    expect(withEmail?.textContent).toContain('Por admin@exemplo.ao');
    expect(withEmail?.textContent).toContain('Alvo: Conta');
    context.fixture.destroy();
  });
});
