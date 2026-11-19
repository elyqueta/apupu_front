import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-config';
import { ApiTask, ApiTeam, ApiTeamMember, Host } from '../../core/api/api.models';
import { AuthService } from '../../core/api/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { Team, TeamMyRole } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { TeamDetailPage } from './team-detail.page';

const BASE = 'http://localhost:3000/api/v1';
const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const TEAM_ID = '22222222-2222-2222-2222-222222222222';
const HOST_EMAIL = 'ana@exemplo.pt';
const HOST_ID = 'host-1';
const ME = 'member-me';
const RUI = 'member-rui';
const JOANA = 'member-joana';

function hostFixture(email = HOST_EMAIL): Host {
  return {
    id: HOST_ID,
    email,
    email_verified: true,
    status: 'active',
    profile: {
      display_name: 'Ana Costa',
      phone: null,
      birth_date: null,
      locale: 'pt-AO',
      timezone: 'Africa/Luanda',
      avatar_url: null,
      cover_url: null,
    },
    profile_complete: true,
    missing_fields: [],
    created_at: '2026-01-01T00:00:00Z',
  };
}

function teamFixture(overrides: Partial<ApiTeam> = {}): ApiTeam {
  return {
    id: TEAM_ID,
    event_id: EVENT_ID,
    event_title: 'Casamento da Ana',
    event_status: 'agendado',
    my_role: 'gestor',
    name: 'Cozinha',
    category: 'catering',
    description: 'Menu e serviço',
    member_count: 3,
    task_count: 2,
    completed_task_count: 0,
    members_preview: [],
    open_task_count: 2,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function memberFixture(overrides: Partial<ApiTeamMember> = {}): ApiTeamMember {
  return {
    id: ME,
    team_id: TEAM_ID,
    email: HOST_EMAIL,
    display_name: 'Ana Costa',
    role: 'membro',
    status: 'ativo',
    origin: 'email',
    is_host: false,
    open_task_count: 0,
    has_event_access: true,
    joined_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function taskFixture(overrides: Partial<ApiTask> = {}): ApiTask {
  return {
    id: 'task-1',
    event_id: EVENT_ID,
    event_title: 'Casamento da Ana',
    team_id: TEAM_ID,
    team_name: 'Cozinha',
    assignee_member_id: ME,
    assignee_email: HOST_EMAIL,
    assignee_display_name: 'Ana Costa',
    assignee_has_access: true,
    manager_id: null,
    manager_email: null,
    title: 'Confirmar menu',
    description: null,
    due_date: null,
    priority: 'normal',
    status: 'por_fazer',
    created_by_host_id: HOST_ID,
    completed_by_member_id: null,
    completed_at: null,
    archived_at: null,
    label: 'Confirmar menu',
    done: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function pageOf<T>(data: T[], page = 1, pageSize = 100, total = data.length) {
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

function errorBody(code: string, details: unknown = null) {
  return {
    error: {
      code,
      message: code,
      request_id: 'req-1',
      ...(details === null ? {} : { details }),
    },
  };
}

/** Deixa as cadeias de promessas dos repositórios avançarem até ao próximo pedido. */
async function tick(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

interface SetupOptions {
  query?: Record<string, string>;
  team?: ApiTeam;
  members?: ApiTeamMember[];
  tasks?: ApiTask[];
  hostEmail?: string;
}

interface Setup {
  fixture: ComponentFixture<TeamDetailPage>;
  http: HttpTestingController;
  toasts: ToastService;
  navigate: ReturnType<typeof vi.spyOn>;
  team: ApiTeam;
  members: ApiTeamMember[];
  tasks: ApiTask[];
}

function setup(options: SetupOptions = {}): Setup {
  const query = options.query ?? {};
  const team = options.team ?? teamFixture();
  const members = options.members ?? [memberFixture()];
  const tasks = options.tasks ?? [];
  const route = {
    snapshot: {
      paramMap: convertToParamMap({ teamId: TEAM_ID }),
      queryParamMap: convertToParamMap(query),
      queryParams: query,
    },
    queryParamMap: of(convertToParamMap(query)),
  };

  TestBed.configureTestingModule({
    imports: [TeamDetailPage],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
      { provide: ActivatedRoute, useValue: route },
      {
        provide: AuthService,
        useValue: {
          host: signal(hostFixture(options.hostEmail)),
          ready: signal(true),
        },
      },
    ],
  });

  const http = TestBed.inject(HttpTestingController);
  const toasts = TestBed.inject(ToastService);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(TeamDetailPage);
  fixture.detectChanges();

  return { fixture, http, toasts, navigate, team, members, tasks };
}

async function flushInitial(context: Setup): Promise<void> {
  const team = context.http.expectOne((req) => req.url === `${BASE}/host/teams/${TEAM_ID}`);
  team.flush({ data: context.team });
  await tick();

  const memberRequest = context.http.expectOne(
    (req) => req.url === `${BASE}/host/teams/${TEAM_ID}/members`,
  );
  expect(memberRequest.request.params.get('page_size')).toBe('100');
  memberRequest.flush(pageOf(context.members));
  await tick();

  const taskRequest = context.http.expectOne((req) => req.url === `${BASE}/host/tasks`);
  expect(taskRequest.request.params.get('team_id')).toBe(TEAM_ID);
  taskRequest.flush(pageOf(context.tasks));
  await tick();
}

async function flushReload(
  context: Setup,
  members = context.members,
  tasks = context.tasks,
): Promise<void> {
  const memberRequest = context.http.expectOne(
    (req) => req.url === `${BASE}/host/teams/${TEAM_ID}/members`,
  );
  expect(memberRequest.request.params.get('page_size')).toBe('100');
  memberRequest.flush(pageOf(members));
  await tick();

  const taskRequest = context.http.expectOne((req) => req.url === `${BASE}/host/tasks`);
  expect(taskRequest.request.params.get('team_id')).toBe(TEAM_ID);
  taskRequest.flush(pageOf(tasks));
  await tick();
}

async function settle(fixture: ComponentFixture<TeamDetailPage>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

function setMyRole(context: Setup, role: TeamMyRole): void {
  const internals = context.fixture.componentInstance as unknown as {
    team: WritableSignal<Team | null>;
  };
  internals.team.update((team) => (team ? { ...team, myRole: role } : team));
  context.fixture.detectChanges();
}

function hasToast(toasts: ToastService, text: string): boolean {
  return toasts.messages().some((message) => message.message.includes(text));
}

describe('TeamDetailPage', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http?.verify();
    vi.restoreAllMocks();
  });

  it('abre o drawer Adicionar membro com as duas opções e desativa ações para membro', async () => {
    const context = setup();
    http = context.http;
    await flushInitial(context);
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    const membersTab = native.querySelector('[data-testid="detail-tab-members"]') as HTMLButtonElement;
    membersTab.click();
    context.fixture.detectChanges();

    expect(membersTab.getAttribute('aria-selected')).toBe('true');
    const addMember = native.querySelector('[data-testid="add-member"]') as HTMLButtonElement;
    expect(addMember.disabled).toBe(false);
    addMember.click();
    context.fixture.detectChanges();

    expect(native.querySelector('[data-testid="member-drawer"]')).toBeTruthy();
    expect(native.querySelector('[data-testid="drawer-mode-account"]')).toBeTruthy();
    expect(native.querySelector('[data-testid="drawer-mode-list"]')).toBeTruthy();

    (native.querySelector('[data-testid="drawer-mode-list"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();
    expect(native.querySelector('[data-testid="drawer-emails"]')).toBeTruthy();

    (native.querySelector('[data-testid="drawer-mode-account"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();
    expect(native.querySelector('[data-testid="drawer-email"]')).toBeTruthy();

    setMyRole(context, 'membro');
    expect(addMember.disabled).toBe(true);
    expect(addMember.getAttribute('aria-disabled')).toBe('true');
    expect(addMember.getAttribute('title')).toBe(
      TestBed.inject(I18nService).t('teamDetail.permissionHint'),
    );

    const menuTrigger = native.querySelector('[data-testid="team-menu"] button') as HTMLButtonElement;
    menuTrigger.click();
    context.fixture.detectChanges();
    const menuItems = Array.from(
      native.querySelectorAll('[role="menuitem"]'),
    ) as HTMLButtonElement[];
    expect(menuItems.length).toBe(2);
    expect(menuItems.every((item) => item.disabled)).toBe(true);
  });

  it('valida o limite de 50 e-mails no drawer', async () => {
    const context = setup();
    http = context.http;
    await flushInitial(context);
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    (native.querySelector('[data-testid="detail-tab-members"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();
    (native.querySelector('[data-testid="add-member"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();
    (native.querySelector('[data-testid="drawer-mode-list"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();

    const textarea = native.querySelector('[data-testid="drawer-emails"]') as HTMLTextAreaElement;
    const submit = native.querySelector('[data-testid="drawer-submit"]') as HTMLButtonElement;
    const i18n = TestBed.inject(I18nService);

    textarea.value = Array.from({ length: 51 }, (_, index) => `user${index + 1}@exemplo.pt`).join('\n');
    textarea.dispatchEvent(new Event('input'));
    context.fixture.detectChanges();

    expect((native.querySelector('[data-testid="drawer-count"]') as HTMLElement).textContent).toContain(
      '51/50',
    );
    expect((native.querySelector('[data-testid="drawer-error"]') as HTMLElement).textContent).toContain(
      i18n.t('errors.tooManyEmails'),
    );
    expect(submit.disabled).toBe(true);

    textarea.value = Array.from({ length: 50 }, (_, index) => `user${index + 1}@exemplo.pt`).join('\n');
    textarea.dispatchEvent(new Event('input'));
    context.fixture.detectChanges();

    expect((native.querySelector('[data-testid="drawer-count"]') as HTMLElement).textContent).toContain(
      '50/50',
    );
    expect(native.querySelector('[data-testid="drawer-error"]')).toBeNull();
    expect(submit.disabled).toBe(false);
  });

  it('conclui tarefa apenas quando o responsável é a conta autenticada e trata 403', async () => {
    const rui = memberFixture({
      id: RUI,
      email: 'rui@exemplo.pt',
      display_name: 'Rui Costa',
    });
    const otherTask = taskFixture({
      id: 'task-2',
      title: 'Montar mesas',
      assignee_member_id: RUI,
      assignee_email: 'rui@exemplo.pt',
      assignee_display_name: 'Rui Costa',
    });
    const context = setup({ members: [memberFixture(), rui], tasks: [taskFixture(), otherTask] });
    http = context.http;
    await flushInitial(context);
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    const myToggle = native.querySelector('[data-testid="task-toggle-task-1"]') as HTMLButtonElement;
    const otherToggle = native.querySelector('[data-testid="task-toggle-task-2"]') as HTMLButtonElement;
    expect(myToggle.disabled).toBe(false);
    expect(otherToggle.disabled).toBe(true);
    expect(otherToggle.getAttribute('aria-disabled')).toBe('true');
    expect(otherToggle.getAttribute('title')).toContain('responsável');

    myToggle.click();
    const complete = http.expectOne(
      (req) => req.url === `${BASE}/host/tasks/task-1/status`,
    );
    expect(complete.request.method).toBe('PATCH');
    expect(complete.request.body).toEqual({ status: 'concluida' });
    const completed = taskFixture({ status: 'concluida' });
    complete.flush({ data: completed });
    await tick();

    await flushReload(context, [memberFixture(), rui], [completed, otherTask]);
    await settle(context.fixture);
    expect(hasToast(context.toasts, 'Tarefa concluída.')).toBe(true);

    const reopen = native.querySelector('[data-testid="task-toggle-task-1"]') as HTMLButtonElement;
    expect(reopen.disabled).toBe(false);
    reopen.click();
    const forbidden = http.expectOne(
      (req) => req.url === `${BASE}/host/tasks/task-1/status`,
    );
    expect(forbidden.request.body).toEqual({ status: 'por_fazer' });
    forbidden.flush(errorBody('task_complete_forbidden'), {
      status: 403,
      statusText: 'Forbidden',
    });
    await settle(context.fixture);

    expect(
      hasToast(context.toasts, TestBed.inject(I18nService).t('errors.taskCompleteForbidden', { name: 'Ana Costa' })),
    ).toBe(true);
  });

  it('reatribui tarefa apenas como anfitrião/gestor', async () => {
    const rui = memberFixture({
      id: RUI,
      email: 'rui@exemplo.pt',
      display_name: 'Rui Costa',
    });
    const joana = memberFixture({
      id: JOANA,
      email: 'joana@exemplo.pt',
      display_name: 'Joana Alves',
    });
    const context = setup({ members: [memberFixture(), rui, joana], tasks: [taskFixture()] });
    http = context.http;
    await flushInitial(context);
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    const select = native.querySelector('[data-testid="task-reassign-task-1"]') as HTMLSelectElement;
    expect(select.disabled).toBe(false);

    select.value = RUI;
    select.dispatchEvent(new Event('change'));
    const assign = http.expectOne((req) => req.url === `${BASE}/host/tasks/task-1/assignee`);
    expect(assign.request.method).toBe('PATCH');
    expect(assign.request.body).toEqual({ assignee_member_id: RUI });
    const reassigned = taskFixture({ assignee_member_id: RUI, assignee_email: 'rui@exemplo.pt' });
    assign.flush({ data: reassigned });
    await tick();

    await flushReload(context, [memberFixture(), rui, joana], [reassigned]);
    await settle(context.fixture);
    expect(hasToast(context.toasts, 'Tarefa reatribuída.')).toBe(true);

    setMyRole(context, 'membro');
    expect(select.disabled).toBe(true);
    expect(select.getAttribute('aria-disabled')).toBe('true');

    setMyRole(context, 'anfitriao');
    expect(select.disabled).toBe(false);
    select.value = JOANA;
    select.dispatchEvent(new Event('change'));
    const forbidden = http.expectOne((req) => req.url === `${BASE}/host/tasks/task-1/assignee`);
    expect(forbidden.request.body).toEqual({ assignee_member_id: JOANA });
    forbidden.flush(errorBody('task_reassign_forbidden'), {
      status: 403,
      statusText: 'Forbidden',
    });
    await settle(context.fixture);

    expect(
      hasToast(context.toasts, TestBed.inject(I18nService).t('errors.taskReassignForbidden')),
    ).toBe(true);
  });

  it('remove membro com reatribuição e trata 409 team_has_open_tasks', async () => {
    const target = memberFixture({
      id: RUI,
      email: 'rui@exemplo.pt',
      display_name: 'Rui Costa',
      open_task_count: 2,
    });
    const other = memberFixture({
      id: JOANA,
      email: 'joana@exemplo.pt',
      display_name: 'Joana Alves',
    });
    const targetTask = taskFixture({
      id: 'task-2',
      assignee_member_id: RUI,
      assignee_email: 'rui@exemplo.pt',
      assignee_display_name: 'Rui Costa',
    });
    const context = setup({
      members: [memberFixture(), target, other],
      tasks: [taskFixture(), targetTask],
    });
    http = context.http;
    await flushInitial(context);
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    (native.querySelector('[data-testid="detail-tab-members"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();
    (native.querySelector(`[data-testid="member-remove-${RUI}"]`) as HTMLButtonElement).click();
    context.fixture.detectChanges();

    const confirmDialog = native.querySelector(
      '[role="dialog"][aria-label="Remover membro da equipa"]',
    ) as HTMLElement;
    expect(confirmDialog).toBeTruthy();
    const confirm = Array.from(confirmDialog.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Remover'),
    ) as HTMLButtonElement;
    confirm.click();

    const remove = http.expectOne(
      (req) => req.url === `${BASE}/host/teams/${TEAM_ID}/members/${RUI}`,
    );
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.params.get('reassign_to_member_id')).toBeNull();
    remove.flush(errorBody('team_has_open_tasks', { tasks: [{ id: 'task-2' }, { id: 'task-3' }] }), {
      status: 409,
      statusText: 'Conflict',
    });
    await settle(context.fixture);

    expect(native.querySelector('[data-testid="remove-reassign"]')).toBeTruthy();
    expect((native.querySelector('[data-testid="remove-reassign"]') as HTMLElement).textContent).toContain(
      '2',
    );

    const targetSelect = native.querySelector(
      '[data-testid="remove-target-member"]',
    ) as HTMLSelectElement;
    targetSelect.value = JOANA;
    targetSelect.dispatchEvent(new Event('input'));
    targetSelect.dispatchEvent(new Event('change'));
    context.fixture.detectChanges();

    (native.querySelector('[data-testid="remove-confirm-reassign"]') as HTMLButtonElement).click();
    const retry = http.expectOne(
      (req) => req.url === `${BASE}/host/teams/${TEAM_ID}/members/${RUI}`,
    );
    expect(retry.request.params.get('reassign_to_member_id')).toBe(JOANA);
    retry.flush({ data: { removed: true, reassigned_tasks: 2 } });
    await tick();

    await flushReload(context, [memberFixture(), other], [taskFixture()]);
    await settle(context.fixture);

    expect(hasToast(context.toasts, 'Rui Costa foi removido da equipa.')).toBe(true);
  });

  it('mostra Não tens acesso a esta equipa em 404', async () => {
    const context = setup();
    http = context.http;

    const team = http.expectOne((req) => req.url === `${BASE}/host/teams/${TEAM_ID}`);
    team.flush(errorBody('team_not_found'), { status: 404, statusText: 'Not Found' });
    await tick();
    await settle(context.fixture);

    const error = context.fixture.nativeElement.querySelector(
      '[data-testid="detail-error"]',
    ) as HTMLElement;
    expect(error).toBeTruthy();
    expect(error.textContent).toContain('Não tens acesso a esta equipa.');
    expect(error.textContent).not.toContain('Cozinha');
  });
});
