import { DOCUMENT } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api-config';
import { apiRequestInterceptor } from '../api/api.interceptor';
import { ApiEvent, ApiInvitation, ApiNotification, ApiTask } from '../api/api.models';
import { SearchService } from './search.service';
import { SessionCache } from './session-cache';
import { WorkspaceStore } from './workspace.store';

const BASE = 'http://localhost:3000/api/v1';

interface Page {
  data: unknown[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
}

function page(data: unknown[] = []): Page {
  return {
    data,
    pagination: { page: 1, page_size: 100, total: data.length, total_pages: data.length ? 1 : 0 },
  };
}

function eventFixture(overrides: Partial<ApiEvent> = {}): ApiEvent {
  return {
    id: 'evt-1',
    title: 'Festa QA Um',
    host_name: 'Ana',
    host_email: 'ana@exemplo.pt',
    category: 'other',
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

function guestFixture(overrides: Partial<ApiInvitation> = {}): ApiInvitation {
  return {
    id: 'inv-1',
    event_id: 'evt-1',
    guest_name: 'João Silva',
    guest_email: 'joao@exemplo.pt',
    guest_phone: null,
    table_name: null,
    rsvp_status: 'pending',
    rsvp_responded_at: null,
    send_status: 'queued',
    send_count: 0,
    last_sent_at: null,
    opened_at: null,
    invitation_url: 'https://apupu-front.vercel.app/convite/token-de-teste',
    invitation_url_expires_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function taskFixture(overrides: Partial<ApiTask> = {}): ApiTask {
  return {
    id: 'task-1',
    event_id: 'evt-1',
    event_title: 'Festa QA Um',
    manager_id: null,
    manager_email: null,
    label: 'Confirmar decoração',
    done: false,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function notificationFixture(overrides: Partial<ApiNotification> = {}): ApiNotification {
  return {
    id: 'nt-1',
    event_id: 'evt-1',
    event_title: 'Festa QA Um',
    activity_id: null,
    kind: 'rsvp_accepted',
    title: 'Rui confirmou presença',
    body: null,
    metadata: {},
    read: false,
    read_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function hostFixture(): unknown {
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

describe('SearchService · suggestions', () => {
  let http: HttpTestingController;
  let search: SearchService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiRequestInterceptor])),
        provideHttpClientTesting(),
        { provide: DOCUMENT, useValue: { cookie: '' } },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(WorkspaceStore);
    search = TestBed.inject(SearchService);

    // "Chrome" carregado pela shell: perfil, atividade, eventos e notificações.
    store.load({});
    http
      .expectOne((request) => request.url.endsWith('/host/profile'))
      .flush({ data: { host: hostFixture() } });
    http.expectOne((request) => request.url.endsWith('/host/activity')).flush(page());
    http.expectOne((request) => request.url.endsWith('/host/events')).flush(page([eventFixture()]));
    http
      .expectOne((request) => request.url.endsWith('/host/notifications'))
      .flush({ ...page([notificationFixture()]), unread_count: 1 });

    // Convidados e tarefas entram só depois de aquecer a pesquisa.
    search.warm();
    http.expectOne((request) => request.url.endsWith('/host/guests')).flush(page([guestFixture()]));
    http.expectOne((request) => request.url.endsWith('/host/tasks')).flush(page([taskFixture()]));

    await new Promise((resolve) => setTimeout(resolve));
  });

  afterEach(() => http.verify());

  it('finds guests by name, ignoring case and accents', () => {
    const group = search.suggest('joao').find((item) => item.key === 'guests');
    expect(group?.items[0]?.label).toBe('João Silva');
    expect(group?.items[0]?.route).toEqual(['/convidados']);
    expect(group?.items[0]?.queryParams).toEqual({ q: 'João Silva' });
  });

  it('finds events by title', () => {
    const group = search.suggest('festa').find((item) => item.key === 'events');
    expect(group?.items[0]?.label).toBe('Festa QA Um');
    expect(group?.items[0]?.route).toEqual(['/eventos', 'evt-1']);
  });

  it('finds tasks by label and opens /tarefas filtered', () => {
    const group = search.suggest('decora').find((item) => item.key === 'tasks');
    expect(group?.items[0]?.label).toBe('Confirmar decoração');
    expect(group?.items[0]?.route).toEqual(['/tarefas']);
    expect(group?.items[0]?.queryParams).toEqual({ q: 'Confirmar decoração' });
  });

  it('finds notifications and marks them as read on pick', () => {
    const group = search.suggest('rui').find((item) => item.key === 'notifications');
    expect(group?.items[0]?.label).toBe('Rui confirmou presença');
    expect(group?.items[0]?.notificationId).toBe('nt-1');
  });

  it('finds pages by their translated label', () => {
    const group = search.suggest('painel').find((item) => item.key === 'pages');
    expect(group?.items[0]?.route).toEqual(['/painel']);
  });

  it('returns nothing for an empty term', () => {
    expect(search.suggest('   ')).toEqual([]);
  });

  it('only warms guests and tasks once, even after repeated warm() calls', () => {
    search.warm();
    search.warm();
    search.warm();
    expect(http.match((request) => request.url.endsWith('/host/guests')).length).toBe(0);
    expect(http.match((request) => request.url.endsWith('/host/tasks')).length).toBe(0);
  });

  it('re-warms after a session reset', () => {
    TestBed.inject(SessionCache).resetAll();
    search.warm();
    http.expectOne((request) => request.url.endsWith('/host/guests')).flush(page([guestFixture()]));
    http.expectOne((request) => request.url.endsWith('/host/tasks')).flush(page([taskFixture()]));
  });
});
