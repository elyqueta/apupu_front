import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api-config';
import { ApiTask } from '../api/api.models';
import { SessionCache } from './session-cache';
import { TeamTasksStore } from './team-tasks.store';

const BASE = 'http://localhost:3000/api/v1';

function taskFixture(overrides: Partial<ApiTask> = {}): ApiTask {
  return {
    id: 'task-1',
    event_id: 'evt-1',
    event_title: 'Casamento da Ana',
    team_id: 'team-1',
    team_name: 'Cozinha',
    assignee_member_id: 'member-1',
    assignee_email: 'rui@exemplo.pt',
    assignee_display_name: 'Rui',
    assignee_has_access: true,
    manager_id: null,
    manager_email: null,
    title: 'Confirmar catering',
    description: null,
    due_date: '2026-11-22',
    priority: 'alta',
    status: 'por_fazer',
    created_by_host_id: 'host-1',
    completed_by_member_id: null,
    completed_at: null,
    archived_at: null,
    label: 'Confirmar catering',
    done: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function pageOf(data: ApiTask[], page = 1, pageSize = 20, total = data.length) {
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

describe('TeamTasksStore', () => {
  let http: HttpTestingController;
  let store: TeamTasksStore;
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
    store = TestBed.inject(TeamTasksStore);
  });

  afterEach(() => http.verify());

  it('lists the tasks of a team with the requested filters', async () => {
    const promise = store.load({
      teamId: 'team-1',
      status: 'por_fazer',
      priority: 'alta',
      page: 1,
      pageSize: 20,
    });

    const request = http.expectOne((req) => req.url === `${BASE}/host/tasks`);
    expect(request.request.params.get('team_id')).toBe('team-1');
    expect(request.request.params.get('status')).toBe('por_fazer');
    expect(request.request.params.get('priority')).toBe('alta');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('page_size')).toBe('20');

    request.flush(pageOf([taskFixture()]));
    await promise;

    expect(store.items().length).toBe(1);
    expect(store.items()[0]?.title).toBe('Confirmar catering');
    expect(store.items()[0]?.teamName).toBe('Cozinha');
    expect(store.total()).toBe(1);
  });

  it('replaces the task in memory after a status change (optimistic UI)', async () => {
    const load = store.load({ teamId: 'team-1', page: 1, pageSize: 20 });
    http
      .expectOne((req) => req.url === `${BASE}/host/tasks`)
      .flush(pageOf([taskFixture()]));
    await load;

    const promise = store.setStatus('task-1', 'concluida');
    const request = http.expectOne(`${BASE}/host/tasks/task-1/status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'concluida' });
    request.flush({
      data: taskFixture({
        status: 'concluida',
        done: true,
        completed_at: '2026-11-20T10:00:00Z',
        completed_by_member_id: 'member-1',
      }),
    });
    await promise;

    expect(store.items()[0]?.status).toBe('concluida');
    expect(store.items()[0]?.completedAt).toBe('2026-11-20T10:00:00Z');
  });

  it('replaces the assignee and keeps the rest of the task', async () => {
    const load = store.load({ teamId: 'team-1', page: 1, pageSize: 20 });
    http
      .expectOne((req) => req.url === `${BASE}/host/tasks`)
      .flush(pageOf([taskFixture()]));
    await load;

    const promise = store.setAssignee('task-1', 'member-2');
    const request = http.expectOne(`${BASE}/host/tasks/task-1/assignee`);
    expect(request.request.body).toEqual({ assignee_member_id: 'member-2' });
    request.flush({
      data: taskFixture({
        assignee_member_id: 'member-2',
        assignee_display_name: 'Joana',
        assignee_email: 'joana@exemplo.pt',
        assignee_has_access: false,
      }),
    });
    await promise;

    expect(store.items()[0]?.assigneeMemberId).toBe('member-2');
    expect(store.items()[0]?.assigneeHasAccess).toBe(false);
    expect(store.items()[0]?.title).toBe('Confirmar catering');
  });

  it('prepends a newly created task and removes a deleted one', async () => {
    const load = store.load({ teamId: 'team-1', page: 1, pageSize: 20 });
    http
      .expectOne((req) => req.url === `${BASE}/host/tasks`)
      .flush(pageOf([taskFixture()]));
    await load;

    const create = store.create({ teamId: 'team-1', title: 'Comprar velas' });
    const createRequest = http.expectOne(`${BASE}/host/tasks`);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({
      team_id: 'team-1',
      title: 'Comprar velas',
      description: undefined,
      due_date: undefined,
      priority: undefined,
      assignee_member_id: undefined,
    });
    createRequest.flush({
      data: taskFixture({ id: 'task-2', title: 'Comprar velas', status: 'por_fazer' }),
    });
    await create;

    expect(store.items().map((task) => task.id)).toEqual(['task-2', 'task-1']);

    const remove = store.remove('task-2');
    const deleteRequest = http.expectOne(`${BASE}/host/tasks/task-2`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null);
    await remove;

    expect(store.items().map((task) => task.id)).toEqual(['task-1']);
  });

  it('is cleared when the session cache resets (logout / another user)', async () => {
    const load = store.load({ teamId: 'team-1', page: 1, pageSize: 20 });
    http
      .expectOne((req) => req.url === `${BASE}/host/tasks`)
      .flush(pageOf([taskFixture()]));
    await load;
    expect(store.items().length).toBe(1);

    sessions.resetAll();

    expect(store.items()).toEqual([]);
    expect(store.pagination()).toBeNull();
    expect(store.total()).toBe(0);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });
});
