import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { DownloadService } from '../../core/services/download.service';
import { AdminNewsletterComponent } from './admin-newsletter.component';

const BASE = 'http://localhost:3000/api/v1';
const SUBSCRIPTION_ID = '11111111-1111-1111-1111-111111111111';

function subscriptionFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: SUBSCRIPTION_ID,
    email: 'ana@example.com',
    created_at: '2026-01-01T00:00:00Z',
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

async function settle(fixture: ComponentFixture<AdminNewsletterComponent>): Promise<void> {
  await tick();
  await fixture.whenStable();
  fixture.detectChanges();
}

function setup(): {
  fixture: ComponentFixture<AdminNewsletterComponent>;
  http: HttpTestingController;
  downloads: DownloadService;
} {
  TestBed.configureTestingModule({
    imports: [AdminNewsletterComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  return {
    fixture: TestBed.createComponent(AdminNewsletterComponent),
    http: TestBed.inject(HttpTestingController),
    downloads: TestBed.inject(DownloadService),
  };
}

function initialList(http: HttpTestingController, data: unknown[] = [subscriptionFixture()]): void {
  const request = http.expectOne((req) => req.url === `${BASE}/admin/newsletter`);
  expect(request.request.params.get('page')).toBe('1');
  expect(request.request.params.get('page_size')).toBe('10');
  request.flush(pageOf(data));
}

describe('AdminNewsletterComponent', () => {
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
      '[data-testid="admin-newsletter-search"]',
    );
    search.value = 'ana';
    search.dispatchEvent(new Event('input'));
    await settle(context.fixture);
    const byQuery = http.expectOne((req) => req.url === `${BASE}/admin/newsletter`);
    expect(byQuery.request.params.get('q')).toBe('ana');
    byQuery.flush(pageOf([subscriptionFixture()]));
    await settle(context.fixture);

    const to: HTMLInputElement = context.fixture.nativeElement.querySelector(
      '[data-testid="admin-newsletter-to"]',
    );
    to.value = '2026-12-31';
    to.dispatchEvent(new Event('change'));
    await settle(context.fixture);
    const byTo = http.expectOne((req) => req.url === `${BASE}/admin/newsletter`);
    expect(byTo.request.params.get('to')).toBe('2026-12-31');
    byTo.flush(pageOf([subscriptionFixture()]));
    await settle(context.fixture);
    context.fixture.destroy();
  });

  it('exporta o CSV com os filtros activos', async () => {
    const context = setup();
    http = context.http;
    const save = vi.spyOn(context.downloads, 'save');
    context.fixture.detectChanges();
    await settle(context.fixture);
    initialList(http);
    await settle(context.fixture);

    const search: HTMLInputElement = context.fixture.nativeElement.querySelector(
      '[data-testid="admin-newsletter-search"]',
    );
    search.value = 'ana';
    search.dispatchEvent(new Event('input'));
    await settle(context.fixture);
    http.expectOne((req) => req.url === `${BASE}/admin/newsletter`).flush(pageOf([]));
    await settle(context.fixture);

    const exportButton: HTMLButtonElement = context.fixture.nativeElement.querySelector(
      '[data-testid="admin-newsletter-export"]',
    );
    expect(exportButton.disabled).toBe(false);
    exportButton.click();

    const exportRequest = http.expectOne(
      (req) => req.url === `${BASE}/admin/newsletter/export`,
    );
    expect(exportRequest.request.method).toBe('GET');
    expect(exportRequest.request.params.get('q')).toBe('ana');
    exportRequest.flush(new Blob(['email'], { type: 'text/csv' }));
    await settle(context.fixture);

    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][1]).toBe('newsletter.csv');
    context.fixture.destroy();
  });

  it('remove a subscrição após confirmação e recarrega', async () => {
    const context = setup();
    http = context.http;
    context.fixture.detectChanges();
    await settle(context.fixture);
    initialList(http);
    await settle(context.fixture);

    const root: HTMLElement = context.fixture.nativeElement;
    const trigger = root.querySelector<HTMLButtonElement>(
      `[data-testid="admin-newsletter-card-${SUBSCRIPTION_ID}"] app-action-menu button[aria-haspopup="menu"]`,
    );
    expect(trigger).toBeTruthy();
    trigger?.click();
    context.fixture.detectChanges();
    const remove = Array.from(
      root.querySelectorAll<HTMLButtonElement>(
        `[data-testid="admin-newsletter-card-${SUBSCRIPTION_ID}"] app-action-menu button[role="menuitem"]`,
      ),
    ).find((button) => button.textContent?.includes('Remover'));
    expect(remove).toBeTruthy();
    remove?.click();
    context.fixture.detectChanges();

    const confirm = root.querySelector<HTMLButtonElement>(
      'app-confirm-dialog [data-testid="app-modal-footer"] button:last-child',
    );
    expect(confirm).toBeTruthy();
    confirm?.click();
    context.fixture.detectChanges();

    const deleteRequest = http.expectOne(
      (req) =>
        req.url === `${BASE}/admin/newsletter/${SUBSCRIPTION_ID}` && req.method === 'DELETE',
    );
    deleteRequest.flush({ data: { removed: true } });
    await settle(context.fixture);

    const reload = http.expectOne((req) => req.url === `${BASE}/admin/newsletter`);
    reload.flush(pageOf([]));
    await settle(context.fixture);
    expect(context.fixture.nativeElement.textContent).toContain(
      'Nenhuma subscrição encontrada com estes filtros.',
    );
    context.fixture.destroy();
  });
});
