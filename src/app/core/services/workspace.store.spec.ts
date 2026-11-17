import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { API_BASE_URL } from '../api/api-config';
import { apiRequestInterceptor, CsrfTokenStore } from '../api/api.interceptor';
import { ApiEvent, ApiInvitation, Host } from '../api/api.models';
import { WorkspaceStore } from './workspace.store';

const BASE = 'http://localhost:3000/api/v1';

function hostFixture(): Host {
  return {
    id: 'host-1',
    email: 'ana@exemplo.pt',
    email_verified: true,
    status: 'active',
    profile: {
      display_name: 'Ana',
      phone: null,
      birth_date: null,
      locale: 'pt-PT',
      timezone: 'Africa/Luanda',
      avatar_url: null,
    },
    profile_complete: true,
    missing_fields: [],
    created_at: '2026-01-01T00:00:00Z',
  };
}

function eventFixture(overrides: Partial<ApiEvent> = {}): ApiEvent {
  return {
    id: 'evt-1',
    title: 'Aniversário',
    host_name: 'Ana',
    host_email: 'ana@exemplo.pt',
    category: 'birthday',
    starts_at: '2026-06-01T18:00:00Z',
    ends_at: null,
    timezone: 'Africa/Luanda',
    location: { type: 'venue', name: 'Salão', address: 'Luanda' },
    message: null,
    rules: null,
    dress_code: null,
    template_id: null,
    theme: { mode: 'dark', palette: 'default' },
    contribution: { enabled: false },
    rsvp_deadline: null,
    status: 'scheduled',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function invitationFixture(overrides: Partial<ApiInvitation> = {}): ApiInvitation {
  return {
    id: 'inv-1',
    event_id: 'evt-1',
    guest_name: 'Rui',
    guest_email: 'rui@exemplo.pt',
    guest_phone: null,
    table_name: null,
    rsvp_status: 'pending',
    rsvp_responded_at: null,
    send_status: 'queued',
    send_count: 0,
    last_sent_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('WorkspaceStore · guest creation', () => {
  let http: HttpTestingController;

  function page(data: unknown[] = []): {
    data: unknown[];
    pagination: { page: number; page_size: number; total: number; total_pages: number };
  } {
    return {
      data,
      pagination: { page: 1, page_size: 100, total: data.length, total_pages: data.length ? 1 : 0 },
    };
  }

  /** O construtor do store carrega o painel inteiro; é preciso responder às 8 chamadas. */
  function flushReload(): void {
    http.expectOne((request) => request.url.endsWith('/host/events')).flush(page());
    http.expectOne((request) => request.url.endsWith('/host/guests')).flush(page());
    http.expectOne((request) => request.url.endsWith('/host/activity')).flush(page());
    http.expectOne((request) => request.url.endsWith('/host/tasks')).flush({ data: [] });
    http
      .expectOne((request) => request.url.endsWith('/host/profile'))
      .flush({ data: { host: hostFixture() } });
    http.expectOne((request) => request.url.endsWith('/templates')).flush({ data: [] });
    http.expectOne((request) => request.url.endsWith('/host/dashboard')).flush({ data: {} });
    http.expectOne((request) => request.url.endsWith('/host/reports/summary')).flush({ data: {} });
  }

  async function setup(cookie: string): Promise<WorkspaceStore> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiRequestInterceptor])),
        provideHttpClientTesting(),
        { provide: DOCUMENT, useValue: { cookie } },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(WorkspaceStore);
    flushReload();
    // Espera que o `reload()` do construtor termine antes de mexer no estado.
    await new Promise((resolve) => setTimeout(resolve));
    return store;
  }

  afterEach(() => http.verify());

  it('adds a guest with the account session, sending CSRF and no manage token', async () => {
    const store = await setup('apupu_csrf_auth=stale-cookie-token');
    TestBed.inject(CsrfTokenStore).set('account-token', '/auth/login');

    const promise = store.addGuest('evt-1', {
      name: 'Rui',
      email: 'rui@exemplo.pt',
      phone: null,
    });
    const request = http.expectOne(`${BASE}/host/events/evt-1/invitations`);

    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-CSRF-Token')).toBe('account-token');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ name: 'Rui', email: 'rui@exemplo.pt', phone: null });
    request.flush({ data: invitationFixture() });

    const result = await promise;
    expect(result.ok).toBe(true);
    expect(result.guest.name).toBe('Rui');
    expect(store.guests()[0]?.id).toBe('inv-1');
  });

  it('keeps the legacy manage-link flow working for the same event', async () => {
    const store = await setup('');

    const open = store.openManagementLink('manage-secret');
    const sessionRequest = http.expectOne(`${BASE}/host/session`);
    expect(sessionRequest.request.method).toBe('POST');
    expect(sessionRequest.request.body).toEqual({ token: 'manage-secret' });
    sessionRequest.flush({
      data: {
        event: eventFixture(),
        csrf_token: 'host-csrf',
        expires_at: '2026-02-01T00:00:00Z',
      },
    });
    await open;

    const promise = store.addGuest('evt-1', {
      name: 'Rui',
      email: 'rui@exemplo.pt',
      phone: null,
    });
    const request = http.expectOne(`${BASE}/host/events/evt-1/invitations`);
    expect(request.request.headers.get('X-CSRF-Token')).toBe('host-csrf');
    request.flush({ data: invitationFixture() });
    await promise;
  });
});
