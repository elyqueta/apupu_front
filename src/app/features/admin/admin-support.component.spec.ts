import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { AdminSupportComponent } from './admin-support.component';

const BASE = 'http://localhost:3000/api/v1';
const MESSAGE_ID = '11111111-1111-1111-1111-111111111111';

function messageFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: MESSAGE_ID,
    name: 'Ana Costa',
    email: 'ana@example.com',
    message: 'Preciso de ajuda com o meu convite.',
    status: 'open',
    created_at: '2026-01-01T00:00:00Z',
    resolved_at: null,
    resolved_by: null,
    ...overrides,
  };
}

function pageOf(data: unknown[], page = 1, total = data.length) {
  return {
    data,
    pagination: { page, page_size: 10, total, total_pages: Math.ceil(total / 10) },
  };
}

async function tick(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function settle(fixture: ComponentFixture<AdminSupportComponent>): Promise<void> {
  await tick();
  await fixture.whenStable();
  fixture.detectChanges();
}

function setup(): { fixture: ComponentFixture<AdminSupportComponent>; http: HttpTestingController } {
  TestBed.configureTestingModule({
    imports: [AdminSupportComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  return {
    fixture: TestBed.createComponent(AdminSupportComponent),
    http: TestBed.inject(HttpTestingController),
  };
}

function initialList(http: HttpTestingController, data: unknown[] = [messageFixture()]): void {
  const request = http.expectOne((req) => req.url === `${BASE}/admin/support`);
  expect(request.request.params.get('page')).toBe('1');
  expect(request.request.params.get('page_size')).toBe('10');
  request.flush(pageOf(data));
}

function clickMenuAction(
  fixture: ComponentFixture<AdminSupportComponent>,
  label: string,
): void {
  const root: HTMLElement = fixture.nativeElement;
  const trigger = root.querySelector<HTMLButtonElement>(
    `[data-testid="admin-support-card-${MESSAGE_ID}"] app-action-menu button[aria-haspopup="menu"]`,
  );
  expect(trigger).toBeTruthy();
  trigger?.click();
  fixture.detectChanges();
  const item = Array.from(
    root.querySelectorAll<HTMLButtonElement>(
      `[data-testid="admin-support-card-${MESSAGE_ID}"] app-action-menu button[role="menuitem"]`,
    ),
  ).find((button) => button.textContent?.includes(label));
  expect(item, label).toBeTruthy();
  item?.click();
  fixture.detectChanges();
}

describe('AdminSupportComponent', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http?.verify();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('pesquisa e filtra na API', async () => {
    const context = setup();
    http = context.http;
    context.fixture.detectChanges();
    await settle(context.fixture);
    initialList(http);
    await settle(context.fixture);

    const search: HTMLInputElement = context.fixture.nativeElement.querySelector(
      '[data-testid="admin-support-search"]',
    );
    search.value = 'Ana';
    search.dispatchEvent(new Event('input'));
    await settle(context.fixture);
    const byQuery = http.expectOne((req) => req.url === `${BASE}/admin/support`);
    expect(byQuery.request.params.get('q')).toBe('Ana');
    byQuery.flush(pageOf([messageFixture()]));
    await settle(context.fixture);

    const status: HTMLSelectElement = context.fixture.nativeElement.querySelector(
      '[data-testid="admin-support-status"]',
    );
    status.value = 'resolved';
    status.dispatchEvent(new Event('change'));
    await settle(context.fixture);
    const byStatus = http.expectOne((req) => req.url === `${BASE}/admin/support`);
    expect(byStatus.request.params.get('status')).toBe('resolved');
    byStatus.flush(pageOf([messageFixture({ status: 'resolved' })]));
    await settle(context.fixture);

    const from: HTMLInputElement = context.fixture.nativeElement.querySelector(
      '[data-testid="admin-support-from"]',
    );
    from.value = '2026-01-01';
    from.dispatchEvent(new Event('change'));
    await settle(context.fixture);
    const byFrom = http.expectOne((req) => req.url === `${BASE}/admin/support`);
    expect(byFrom.request.params.get('from')).toBe('2026-01-01');
    byFrom.flush(pageOf([messageFixture()]));
    await settle(context.fixture);
    context.fixture.destroy();
  });

  it('mostra o detalhe completo da mensagem', async () => {
    const context = setup();
    http = context.http;
    context.fixture.detectChanges();
    await settle(context.fixture);
    initialList(http);
    await settle(context.fixture);

    clickMenuAction(context.fixture, 'Ver mensagem');
    const detailRequest = http.expectOne(
      (req) => req.url === `${BASE}/admin/support/${MESSAGE_ID}`,
    );
    expect(detailRequest.request.method).toBe('GET');
    detailRequest.flush({ data: messageFixture() });
    await settle(context.fixture);

    const detail: HTMLElement = context.fixture.nativeElement.querySelector(
      '[data-testid="admin-support-detail"]',
    );
    expect(detail).toBeTruthy();
    expect(detail.textContent).toContain('Preciso de ajuda com o meu convite.');
    context.fixture.destroy();
  });

  it('marca como resolvida após confirmação e recarrega', async () => {
    const context = setup();
    http = context.http;
    context.fixture.detectChanges();
    await settle(context.fixture);
    initialList(http);
    await settle(context.fixture);

    clickMenuAction(context.fixture, 'Marcar como resolvida');
    const root: HTMLElement = context.fixture.nativeElement;
    const confirm = root.querySelector<HTMLButtonElement>(
      'app-confirm-dialog [data-testid="app-modal-footer"] button:last-child',
    );
    expect(confirm).toBeTruthy();
    confirm?.click();
    context.fixture.detectChanges();

    const resolveRequest = http.expectOne(
      (req) => req.url === `${BASE}/admin/support/${MESSAGE_ID}/resolve`,
    );
    expect(resolveRequest.request.method).toBe('POST');
    resolveRequest.flush({ data: messageFixture({ status: 'resolved' }) });
    await settle(context.fixture);

    const reload = http.expectOne((req) => req.url === `${BASE}/admin/support`);
    reload.flush(pageOf([messageFixture({ status: 'resolved' })]));
    await settle(context.fixture);
    expect(root.textContent).toContain('Resolvida');
    context.fixture.destroy();
  });
});
