import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { API_BASE_URL } from '../api/api-config';
import { apiRequestInterceptor, CsrfTokenStore } from '../api/api.interceptor';
import { ApiEvent, ApiInvitation, Host } from '../api/api.models';
import { SessionCache } from './session-cache';
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
      cover_url: null,
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
    cover_url: null,
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
    whatsapp_shared_at: null,
    whatsapp_share_count: 0,
    opened_at: null,
    invitation_url: 'https://apupu-front.vercel.app/convite/token-de-teste',
    invitation_url_expires_at: null,
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

  /** O carregamento inicial é disparado por `ensureLoaded()`: apenas o "chrome". */
  function flushReload(): void {
    http
      .expectOne((request) => request.url.endsWith('/host/profile'))
      .flush({ data: { host: hostFixture() } });
    http.expectOne((request) => request.url.endsWith('/host/activity')).flush(page());
    http.expectOne((request) => request.url.endsWith('/host/events')).flush(page());
    http
      .expectOne((request) => request.url.endsWith('/host/notifications'))
      .flush({ ...page(), unread_count: 0 });
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
    store.ensureLoaded();
    flushReload();
    // Espera que o `ensureLoaded()` termine antes de mexer no estado.
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
    expect(request.request.body).toEqual({
      name: 'Rui',
      email: 'rui@exemplo.pt',
      phone: null,
      guest_kind: null,
      companion_name: null,
      party_size: null,
    });
    request.flush({ data: invitationFixture() });

    const result = await promise;
    expect(result.ok).toBe(true);
    expect(result.guest.name).toBe('Rui');
    expect(store.guests()[0]?.id).toBe('inv-1');
  });

  it('updates a guest through PATCH and replaces the cached entry', async () => {
    const store = await setup('');
    store.load({ guests: true });
    http
      .expectOne((request) => request.url.endsWith('/host/guests'))
      .flush(page([invitationFixture()]));
    await new Promise((resolve) => setTimeout(resolve));

    const guest = store.guests()[0]!;
    const promise = store.updateGuest(guest, {
      name: 'Rui Silva',
      email: 'rui@exemplo.pt',
      phone: '+244900000000',
    });
    const request = http.expectOne(`${BASE}/host/events/evt-1/invitations/inv-1`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      name: 'Rui Silva',
      email: 'rui@exemplo.pt',
      phone: '+244900000000',
      guest_kind: null,
      companion_name: null,
      party_size: null,
    });
    request.flush({
      data: invitationFixture({
        guest_name: 'Rui Silva',
        guest_phone: '+244900000000',
        opened_at: '2026-02-01T00:00:00Z',
      }),
    });

    const updated = await promise;
    expect(updated.name).toBe('Rui Silva');
    expect(updated.openedAt).toBe('2026-02-01T00:00:00Z');
    expect(store.guests().find((item) => item.id === 'inv-1')?.name).toBe('Rui Silva');
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

  it('empties cached host data when the session cache resets (logout/relogin)', async () => {
    const store = await setup('');

    const promise = store.addGuest('evt-1', {
      name: 'Rui',
      email: 'rui@exemplo.pt',
      phone: null,
    });
    http.expectOne(`${BASE}/host/events/evt-1/invitations`).flush({ data: invitationFixture() });
    await promise;
    expect(store.guests().length).toBe(1);

    TestBed.inject(SessionCache).resetAll();

    expect(store.guests()).toEqual([]);
    expect(store.events()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('loads only the requested scope on top of the chrome', async () => {
    const store = await setup('');

    store.load({ guests: true });
    http.expectOne((request) => request.url.endsWith('/host/guests')).flush(page());

    // Domínios não pedidos não são contactados.
    http.expectNone((request) => request.url.endsWith('/host/tasks'));
    http.expectNone((request) => request.url.endsWith('/host/dashboard'));
    http.expectNone((request) => request.url.endsWith('/host/reports/summary'));
    http.expectNone((request) => request.url.endsWith('/templates'));
    await new Promise((resolve) => setTimeout(resolve));

    expect(store.loading()).toBe(false);
  });

  it('exposes a manager session as read/write for the event but not as host', async () => {
    const store = await setup('');

    const open = store.openManagementLink('manager-secret');
    http.expectOne(`${BASE}/host/session`).flush({
      data: {
        event: eventFixture({ access_role: 'manager' }),
        role: 'manager',
        access_role: 'manager',
        csrf_token: 'manager-csrf',
        expires_at: '2026-02-01T00:00:00Z',
        manage_email_status: null,
        manage_token_expires_at: null,
      },
    });
    await open;

    expect(store.managementRole()).toBe('manager');
    expect(store.accessRoleFor('evt-1')).toBe('manager');
    expect(store.isEventHost('evt-1')).toBe(false);
  });

  it('lists and adds managers for the host event', async () => {
    const store = await setup('');

    const list = store.loadManagers('evt-1');
    http.expectOne(`${BASE}/host/events/evt-1/managers`).flush({
      data: [
        {
          id: 'mgr-1',
          event_id: 'evt-1',
          email: 'paulo@exemplo.pt',
          has_account: false,
          last_used_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
    await list;
    expect(store.managersFor('evt-1')[0]?.email).toBe('paulo@exemplo.pt');
    expect(store.managersFor('evt-1')[0]?.hasAccount).toBe(false);

    const add = store.addManager('evt-1', 'rita@exemplo.pt');
    const request = http.expectOne(`${BASE}/host/events/evt-1/managers`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'rita@exemplo.pt' });
    request.flush({
      data: {
        manager: {
          id: 'mgr-2',
          event_id: 'evt-1',
          email: 'rita@exemplo.pt',
          has_account: true,
          last_used_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        invite_email_status: 'queued',
      },
    });

    const result = await add;
    expect(result.emailStatus).toBe('queued');
    expect(store.managersFor('evt-1').map((manager) => manager.email)).toEqual([
      'paulo@exemplo.pt',
      'rita@exemplo.pt',
    ]);
  });

  it('clears cached managers when the session cache resets', async () => {
    const store = await setup('');

    const list = store.loadManagers('evt-1');
    http.expectOne(`${BASE}/host/events/evt-1/managers`).flush({
      data: [
        {
          id: 'mgr-1',
          event_id: 'evt-1',
          email: 'paulo@exemplo.pt',
          has_account: false,
          last_used_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
    await list;
    expect(store.managersFor('evt-1').length).toBe(1);

    TestBed.inject(SessionCache).resetAll();

    expect(store.managersFor('evt-1')).toEqual([]);
  });
});
