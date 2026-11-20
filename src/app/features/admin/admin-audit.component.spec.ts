import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { AdminAuditComponent } from './admin-audit.component';

const BASE = 'http://localhost:3000/api/v1';

function pageOf(data: unknown[]) {
  return {
    data,
    pagination: { page: 1, page_size: 10, total: data.length, total_pages: 1 },
  };
}

async function settle(fixture: ComponentFixture<AdminAuditComponent>): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('AdminAuditComponent · activity display', () => {
  let http: HttpTestingController;

  beforeEach(() => TestBed.resetTestingModule());

  afterEach(() => {
    try {
      http?.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  it('shows descriptions, actor and translated target for each entry', async () => {
    TestBed.configureTestingModule({
      imports: [AdminAuditComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: BASE },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const fixture = TestBed.createComponent(AdminAuditComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await settle(fixture);
    http.expectOne((req) => req.url === `${BASE}/admin/audit`).flush(
      pageOf([
        {
          id: 'log-1',
          admin_id: 'admin-1',
          admin_name: 'Admin Geral',
          admin_email: 'admin@exemplo.ao',
          action: 'admin_user_report_exported',
          target_type: 'host',
          target_id: '00000000-0000-4000-8000-000000000001',
          reason: null,
          metadata: {},
          created_at: '2026-11-20T15:00:00Z',
        },
      ]),
    );
    await settle(fixture);

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[data-testid="admin-audit-action-log-1"]')?.textContent).toContain(
      'Relatório individual exportado em PDF',
    );
    expect(root.querySelector('[data-testid="admin-audit-actor-log-1"]')?.textContent).toContain(
      'Admin Geral',
    );
    const item = root.querySelector('[data-testid="admin-audit-entry-log-1"]');
    expect(item?.textContent).toContain('Conta');
    expect(item?.textContent).not.toContain('host ·');
    fixture.destroy();
  });
});
