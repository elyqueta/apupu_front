import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { AdminEventsComponent } from './admin-events.component';

const BASE = 'http://localhost:3000/api/v1';
const EVENT_ID = '11111111-1111-1111-1111-111111111111';

function eventFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: EVENT_ID,
    title: 'Casamento da Ana',
    host_name: 'Ana Costa',
    host_email: 'ana@example.com',
    starts_at: '2026-06-20T15:00:00Z',
    ends_at: null,
    created_at: '2026-01-01T00:00:00Z',
    status: 'active',
    guest_count: 12,
    team_count: 2,
    cancelled_at: null,
    cancelled_reason: null,
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

async function settle(fixture: ComponentFixture<AdminEventsComponent>): Promise<void> {
  await tick();
  await fixture.whenStable();
  fixture.detectChanges();
}

function setup(): { fixture: ComponentFixture<AdminEventsComponent>; http: HttpTestingController } {
  TestBed.configureTestingModule({
    imports: [AdminEventsComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  return {
    fixture: TestBed.createComponent(AdminEventsComponent),
    http: TestBed.inject(HttpTestingController),
  };
}

function initialList(http: HttpTestingController, data: unknown[] = [eventFixture()]): void {
  const request = http.expectOne((req) => req.url === `${BASE}/admin/events`);
  expect(request.request.params.get('page')).toBe('1');
  expect(request.request.params.get('page_size')).toBe('10');
  request.flush(pageOf(data));
}

function clickMenuAction(
  fixture: ComponentFixture<AdminEventsComponent>,
  label: string,
): void {
  const root: HTMLElement = fixture.nativeElement;
  const trigger = root.querySelector<HTMLButtonElement>(
    `[data-testid="admin-event-card-${EVENT_ID}"] app-action-menu button[aria-haspopup="menu"]`,
  );
  expect(trigger).toBeTruthy();
  trigger?.click();
  fixture.detectChanges();
  const item = Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      '[data-testid="action-menu-panel"] button[role="menuitem"]',
    ),
  ).find((button) => button.textContent?.includes(label));
  expect(item, label).toBeTruthy();
  item?.click();
  fixture.detectChanges();
}

describe('AdminEventsComponent', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http?.verify();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('pesquisa e filtra na API e muda de página', async () => {
    const context = setup();
    http = context.http;
    context.fixture.detectChanges();
    await settle(context.fixture);
    initialList(http);
    await settle(context.fixture);
    expect(context.fixture.nativeElement.textContent).toContain('Casamento da Ana');

    const search: HTMLInputElement = context.fixture.nativeElement.querySelector(
      '[data-testid="admin-events-search"]',
    );
    search.value = 'Ana';
    search.dispatchEvent(new Event('input'));
    await settle(context.fixture);
    const filtered = http.expectOne((req) => req.url === `${BASE}/admin/events`);
    expect(filtered.request.params.get('q')).toBe('Ana');
    expect(filtered.request.params.get('page')).toBe('1');
    filtered.flush(pageOf([eventFixture()]));

    const status: HTMLSelectElement = context.fixture.nativeElement.querySelector(
      '[data-testid="admin-events-status"]',
    );
    status.value = 'cancelled';
    status.dispatchEvent(new Event('change'));
    await settle(context.fixture);
    const byStatus = http.expectOne((req) => req.url === `${BASE}/admin/events`);
    expect(byStatus.request.params.get('status')).toBe('cancelled');
    byStatus.flush(pageOf([eventFixture({ status: 'cancelled' })]));

    await settle(context.fixture);
    expect(context.fixture.nativeElement.textContent).toContain('Cancelado');
    context.fixture.destroy();
  });

  it('cancela um evento com motivo, OTP e confirmação final', async () => {
    const context = setup();
    const root: HTMLElement = context.fixture.nativeElement;
    http = context.http;
    context.fixture.detectChanges();
    await settle(context.fixture);
    initialList(http);
    await settle(context.fixture);

    clickMenuAction(context.fixture, 'Cancelar evento');

    const reason = root.querySelector<HTMLTextAreaElement>('[data-testid="admin-cancel-reason"]')!;
    expect(reason).toBeTruthy();
    reason.value = 'Pedido do anfitrião';
    reason.dispatchEvent(new Event('input'));
    context.fixture.detectChanges();
    const send = root.querySelector<HTMLButtonElement>('[data-testid="admin-cancel-send"]')!;
    expect(send.disabled).toBe(false);
    send.click();

    const otpRequest = http.expectOne(
      (req) => req.url === `${BASE}/admin/events/${EVENT_ID}/cancel/otp`,
    );
    expect(otpRequest.request.method).toBe('POST');
    otpRequest.flush({ data: null });
    await settle(context.fixture);

    const otp = root.querySelector<HTMLInputElement>('[data-testid="admin-cancel-otp"]')!;
    expect(otp).toBeTruthy();
    otp.value = '123456';
    otp.dispatchEvent(new Event('input'));
    context.fixture.detectChanges();
    const confirm = root.querySelector<HTMLButtonElement>('[data-testid="admin-cancel-confirm"]')!;
    expect(confirm.disabled).toBe(false);
    confirm.click();
    context.fixture.detectChanges();

    const dialogConfirm = root.querySelector<HTMLButtonElement>(
      'app-confirm-dialog [data-testid="app-modal-footer"] button:last-child',
    );
    expect(dialogConfirm).toBeTruthy();
    dialogConfirm?.click();

    const cancelRequest = http.expectOne(
      (req) => req.url === `${BASE}/admin/events/${EVENT_ID}/cancel`,
    );
    expect(cancelRequest.request.method).toBe('POST');
    expect(cancelRequest.request.body).toEqual({
      reason: 'Pedido do anfitrião',
      otp: '123456',
    });
    cancelRequest.flush({ data: null });
    await settle(context.fixture);

    // O cancelamento recarrega a lista.
    const reload = http.expectOne((req) => req.url === `${BASE}/admin/events`);
    reload.flush(pageOf([eventFixture({ status: 'cancelled' })]));
    await settle(context.fixture);
    expect(context.fixture.nativeElement.textContent).toContain('Evento');
    context.fixture.destroy();
  });
});
