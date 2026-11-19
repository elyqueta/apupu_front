import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api-config';
import { ApiTeam } from '../api/api.models';
import { mapTeam } from '../api/mappers';
import { SessionCache } from './session-cache';
import { TeamsStore } from './teams.store';

const BASE = 'http://localhost:3000/api/v1';

function teamFixture(overrides: Partial<ApiTeam> = {}): ApiTeam {
  return {
    id: 'team-1',
    event_id: 'evt-1',
    event_title: 'Casamento da Ana',
    event_status: 'agendado',
    my_role: 'gestor',
    name: 'Cozinha',
    category: 'catering',
    description: 'Menu e serviço',
    member_count: 3,
    task_count: 7,
    completed_task_count: 5,
    members_preview: [
      { id: 'member-1', display_name: 'Ana Costa', avatar_url: null },
      { id: 'member-2', display_name: null, avatar_url: null },
    ],
    open_task_count: 2,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function pageOf(data: ApiTeam[], page = 1, pageSize = 12, total = data.length) {
  return {
    data,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
  };
}

function errorBody(code: string, message = code) {
  return {
    error: { code, message, request_id: 'req-1', fields: {}, details: null },
  };
}

describe('TeamsStore', () => {
  let http: HttpTestingController;
  let store: TeamsStore;
  let sessions: SessionCache;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    sessions = TestBed.inject(SessionCache);
    store = TestBed.inject(TeamsStore);
  });

  afterEach(() => http.verify());

  it('sends every active filter to the server and keeps the page', async () => {
    const promise = store.load({
      q: 'cozinha',
      role: 'gestor',
      eventStatus: 'em_curso',
      category: 'catering',
      mine: true,
      page: 2,
      pageSize: 12,
    });

    const request = http.expectOne((req) => req.url === `${BASE}/host/teams`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('q')).toBe('cozinha');
    expect(request.request.params.get('role')).toBe('gestor');
    expect(request.request.params.get('event_status')).toBe('em_curso');
    expect(request.request.params.get('category')).toBe('catering');
    expect(request.request.params.get('mine')).toBe('true');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('page_size')).toBe('12');

    request.flush(pageOf([teamFixture()], 2, 12, 13));
    await promise;

    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.items().length).toBe(1);
    expect(store.items()[0]).toEqual({
      id: 'team-1',
      eventId: 'evt-1',
      eventTitle: 'Casamento da Ana',
      eventStatus: 'agendado',
      myRole: 'gestor',
      name: 'Cozinha',
      category: 'catering',
      description: 'Menu e serviço',
      memberCount: 3,
      taskCount: 7,
      completedTaskCount: 5,
      membersPreview: [
        { id: 'member-1', displayName: 'Ana Costa', avatarUrl: null },
        { id: 'member-2', displayName: null, avatarUrl: null },
      ],
      openTaskCount: 2,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    });
    expect(store.total()).toBe(13);
    expect(store.pagination()?.page).toBe(2);
  });

  it('keeps a 404 as state instead of throwing, so the page can show "sem acesso"', async () => {
    const promise = store.load({ page: 1, pageSize: 12 });
    const request = http.expectOne((req) => req.url === `${BASE}/host/teams`);
    request.flush(errorBody('team_not_found', 'Equipa não encontrada'), {
      status: 404,
      statusText: 'Not Found',
    });
    await promise;

    expect(store.loading()).toBe(false);
    expect(store.items()).toEqual([]);
    expect(store.pagination()).toBeNull();
    expect(store.error()?.status).toBe(404);
    expect(store.error()?.code).toBe('team_not_found');
  });

  it('refresh repeats the last query (filters survive a mutation)', async () => {
    const first = store.load({ role: 'membro', mine: true, page: 3, pageSize: 12 });
    const initial = http.expectOne((req) => req.url === `${BASE}/host/teams`);
    expect(initial.request.params.get('role')).toBe('membro');
    expect(initial.request.params.get('mine')).toBe('true');
    expect(initial.request.params.get('page')).toBe('3');
    initial.flush(pageOf([teamFixture({ my_role: 'membro' })], 3, 12, 30));
    await first;

    const refresh = store.refresh();
    const again = http.expectOne((req) => req.url === `${BASE}/host/teams`);
    expect(again.request.params.get('role')).toBe('membro');
    expect(again.request.params.get('mine')).toBe('true');
    expect(again.request.params.get('page')).toBe('3');
    again.flush(pageOf([teamFixture({ my_role: 'membro', open_task_count: 1 })], 3, 12, 30));
    await refresh;

    expect(store.items()[0]?.openTaskCount).toBe(1);
  });

  it('ignores a stale response when a newer load starts', async () => {
    const slow = store.load({ q: 'antiga', page: 1, pageSize: 12 });
    const slowRequest = http.expectOne((req) => req.url === `${BASE}/host/teams`);

    const fast = store.load({ q: 'nova', page: 1, pageSize: 12 });
    const fastRequest = http.expectOne((req) => req.url === `${BASE}/host/teams`);
    fastRequest.flush(pageOf([teamFixture({ id: 'team-2', name: 'Nova' })]));
    await fast;

    slowRequest.flush(pageOf([teamFixture({ id: 'team-1', name: 'Antiga' })]));
    await slow;

    expect(store.items().map((team) => team.name)).toEqual(['Nova']);
  });

  it('is cleared when the session cache resets (logout / another user)', async () => {
    const promise = store.load({ q: 'cozinha', page: 1, pageSize: 12 });
    http
      .expectOne((req) => req.url === `${BASE}/host/teams`)
      .flush(pageOf([teamFixture()]));
    await promise;
    expect(store.items().length).toBe(1);

    sessions.resetAll();

    expect(store.items()).toEqual([]);
    expect(store.pagination()).toBeNull();
    expect(store.total()).toBe(0);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('replaces and removes a single team in memory', async () => {
    const promise = store.load({ page: 1, pageSize: 12 });
    http
      .expectOne((req) => req.url === `${BASE}/host/teams`)
      .flush(pageOf([teamFixture(), teamFixture({ id: 'team-2', name: 'Música' })]));
    await promise;

    store.upsert(mapTeam(teamFixture({ name: 'Cozinha principal', member_count: 4 })));
    expect(store.items()[0]?.name).toBe('Cozinha principal');
    expect(store.items()[0]?.memberCount).toBe(4);

    store.remove('team-2');
    expect(store.items().map((team) => team.id)).toEqual(['team-1']);
  });
});
