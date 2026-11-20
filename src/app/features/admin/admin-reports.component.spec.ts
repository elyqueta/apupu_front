import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/api/api-config';
import { DownloadService } from '../../core/services/download.service';
import { ToastService } from '../../core/services/toast.service';
import { AdminReportsComponent } from './admin-reports.component';

const BASE = 'http://localhost:3000/api/v1';
const REPORT_ID = '11111111-1111-1111-1111-111111111111';

function weeklyFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: REPORT_ID,
    week_start: '2026-11-23',
    status: 'ready',
    filename: 'conto-contigo_relatorio-semanal_2026-11-23.pdf',
    size_bytes: 25600,
    host_count: 8,
    generated_at: '2026-11-23T09:00:00Z',
    created_at: '2026-11-23T09:00:00Z',
    ...overrides,
  };
}

async function tick(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function settle(fixture: ComponentFixture<AdminReportsComponent>): Promise<void> {
  await tick();
  await fixture.whenStable();
  fixture.detectChanges();
}

function setup(): {
  fixture: ComponentFixture<AdminReportsComponent>;
  http: HttpTestingController;
} {
  TestBed.configureTestingModule({
    imports: [AdminReportsComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  return {
    fixture: TestBed.createComponent(AdminReportsComponent),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('AdminReportsComponent', () => {
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

  it('lista as semanas e descarrega o PDF com o nome da API', async () => {
    const context = setup();
    http = context.http;
    const save = vi.spyOn(TestBed.inject(DownloadService), 'save');
    context.fixture.detectChanges();
    await settle(context.fixture);

    const list = http.expectOne((req) => req.url === `${BASE}/admin/reports/weekly`);
    expect(list.request.method).toBe('GET');
    list.flush({ data: [weeklyFixture()] });
    await settle(context.fixture);

    const root: HTMLElement = context.fixture.nativeElement;
    expect(root.querySelector('[data-testid="admin-reports-list"]')).toBeTruthy();
    expect(
      root.querySelector(`[data-testid="admin-reports-row-${REPORT_ID}"]`)?.textContent,
    ).toContain('25 KB');

    root.querySelector<HTMLButtonElement>(`[data-testid="admin-reports-download-${REPORT_ID}"]`)?.click();
    const download = http.expectOne(
      (req) => req.url === `${BASE}/admin/reports/weekly/${REPORT_ID}/download`,
    );
    expect(download.request.method).toBe('GET');
    download.flush(new Blob(['%PDF-'], { type: 'application/pdf' }), {
      headers: new HttpHeaders({
        'Content-Disposition': 'attachment; filename="relatorio-semanal.pdf"',
      }),
    });
    await settle(context.fixture);

    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0].filename).toBe('relatorio-semanal.pdf');
    context.fixture.destroy();
  });

  it('exporta todos os perfis e confirma o download', async () => {
    const context = setup();
    http = context.http;
    const save = vi.spyOn(TestBed.inject(DownloadService), 'save');
    const toasts = TestBed.inject(ToastService);
    context.fixture.detectChanges();
    await settle(context.fixture);
    http.expectOne((req) => req.url === `${BASE}/admin/reports/weekly`).flush({ data: [] });
    await settle(context.fixture);

    const root: HTMLElement = context.fixture.nativeElement;
    expect(root.querySelector('[data-testid="admin-reports-empty"]')).toBeTruthy();

    root.querySelector<HTMLButtonElement>('[data-testid="admin-reports-export-all"]')?.click();
    const exportRequest = http.expectOne((req) => req.url === `${BASE}/admin/reports/all`);
    expect(exportRequest.request.method).toBe('GET');
    exportRequest.flush(new Blob(['%PDF-'], { type: 'application/pdf' }));
    await settle(context.fixture);

    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][1]).toBe('conto-contigo_relatorio-semanal.pdf');
    expect(toasts.messages().some((message) => message.message === 'Relatório descarregado.')).toBe(
      true,
    );
    context.fixture.destroy();
  });
});
