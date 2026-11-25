import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-config';
import { ApiHostEventManager, ApiTeam } from '../../core/api/api.models';
import { ToastService } from '../../core/services/toast.service';
import { TeamPage } from './team.page';

const BASE = 'http://localhost:3000/api/v1';
const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const TEAM_ID = '22222222-2222-2222-2222-222222222222';

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
    task_count: 7,
    completed_task_count: 5,
    members_preview: [
      { id: 'member-1', display_name: 'Ana Costa', avatar_url: null },
      { id: 'member-2', display_name: 'Rui Costa', avatar_url: null },
    ],
    open_task_count: 2,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function pageOf<T>(data: T[], page = 1, pageSize = 12, total = data.length) {
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

function managerFixture(): ApiHostEventManager {
  return {
    id: 'manager-1',
    event_id: EVENT_ID,
    email: 'gestor@exemplo.pt',
    phone: null,
    display_name: 'Gestor da Cozinha',
    team_id: TEAM_ID,
    link_expires_at: '2026-09-01T00:00:00Z',
    link_revoked_at: null,
    has_account: true,
    last_used_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    event: {
      id: EVENT_ID,
      title: 'Casamento da Ana',
      starts_at: '2026-08-20T12:00:00Z',
      status: 'scheduled',
    },
  };
}

interface Setup {
  fixture: ComponentFixture<TeamPage>;
  http: HttpTestingController;
  toasts: ToastService;
  navigate: ReturnType<typeof vi.spyOn>;
}

function setup(query: Record<string, string> = {}): Setup {
  const route = {
    snapshot: {
      paramMap: convertToParamMap({}),
      queryParamMap: convertToParamMap(query),
      queryParams: query,
    },
    queryParamMap: of(convertToParamMap(query)),
  };

  TestBed.configureTestingModule({
    imports: [TeamPage],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
      { provide: ActivatedRoute, useValue: route },
    ],
  });

  const http = TestBed.inject(HttpTestingController);
  const toasts = TestBed.inject(ToastService);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(TeamPage);
  fixture.detectChanges();
  return { fixture, http, toasts, navigate };
}

/** Deixa a cadeia de promessas do repositório atualizar os signals da página. */
async function tick(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function settle(fixture: ComponentFixture<TeamPage>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

/**
 * A página lança em paralelo a lista de equipas (`/host/teams`) e a lista
 * global de gestores (`/host/managers`), mesmo quando o separador ativo é
 * outro. Ambos precisam de resposta para não deixar pedidos pendentes.
 */
async function flushBootstrap(
  context: Setup,
  teams: ApiTeam[] = [teamFixture()],
  managers: ApiHostEventManager[] = [managerFixture()],
  preMatched: TestRequest[] = [],
): Promise<void> {
  // `expectOne`/`match` removem o pedido da fila; aceitamos pedidos já
  // capturados para não deixar nenhum sem resposta.
  const teamRequests = [
    ...preMatched.filter((request) => request.request.url === `${BASE}/host/teams`),
    ...context.http.match((req) => req.url === `${BASE}/host/teams`),
  ];
  const managerRequests = [
    ...preMatched.filter((request) => request.request.url === `${BASE}/host/managers`),
    ...context.http.match((req) => req.url === `${BASE}/host/managers`),
  ];
  for (const request of teamRequests) {
    request.flush(pageOf(teams));
  }
  for (const request of managerRequests) {
    request.flush({ data: managers });
  }
  await tick();
  await settle(context.fixture);
}

describe('TeamPage', () => {
  let http: HttpTestingController;

  afterEach(() => {
    TestBed.resetTestingModule();
    http?.verify();
    vi.restoreAllMocks();
  });

  it('cria equipa e gestor no modal partilhado e mostra o código uma vez', async () => {
    const context = setup({ evento: EVENT_ID });
    http = context.http;

    const initial = http.match((req) => req.url === `${BASE}/host/teams`);
    expect(initial.length).toBe(1);
    expect(initial[0].request.params.get('event_id')).toBe(EVENT_ID);
    await flushBootstrap(context, [teamFixture({ name: 'Cozinha antiga' })], undefined, initial);

    const newButton = context.fixture.nativeElement.querySelector('[data-testid="new-team"]');
    newButton.click();
    context.fixture.detectChanges();

    const name = context.fixture.nativeElement.querySelector('[data-testid="team-manager-name"]');
    name.value = 'Cozinha nova';
    name.dispatchEvent(new Event('input'));
    const email = context.fixture.nativeElement.querySelector('[data-testid="team-manager-email"]');
    email.value = 'gestor@exemplo.pt';
    email.dispatchEvent(new Event('input'));
    context.fixture.detectChanges();

    const submit = context.fixture.nativeElement.querySelector('[data-testid="team-manager-submit"]');
    expect(submit.disabled).toBe(false);
    submit.click();

    const create = http.expectOne(`${BASE}/host/events/${EVENT_ID}/managers`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      team_name: 'Cozinha nova',
      team_category: 'outra',
      team_description: null,
      display_name: null,
      email: 'gestor@exemplo.pt',
      phone: null,
      link_expires_at: null,
    });
    create.flush({
      data: {
        manager: managerFixture(),
        team: teamFixture({ name: 'Cozinha nova' }),
        link: `https://apupu.co/gerir/secret-token`,
        access_code: 'ABC123',
        invite_email_status: 'queued',
      },
    });
    await tick();
    // A criação recarrega a lista de equipas e a lista global de gestores.
    await flushBootstrap(context, [teamFixture({ name: 'Cozinha nova' })]);

    expect(context.navigate).not.toHaveBeenCalled();
    expect(context.fixture.nativeElement.querySelector('[data-testid="manager-code"]').textContent).toContain(
      'ABC-123',
    );
    expect(
      context.fixture.nativeElement.querySelector('[data-testid="manager-credentials-done"]'),
    ).toBeTruthy();

    context.fixture.nativeElement
      .querySelector('[data-testid="manager-credentials-done"]')
      .click();
    context.fixture.detectChanges();
  });

  it('filtra a lista por evento via ?evento=', async () => {
    const context = setup({ evento: EVENT_ID });
    http = context.http;

    const request = http.match((req) => req.url === `${BASE}/host/teams`);
    expect(request.length).toBe(1);
    expect(request[0].request.method).toBe('GET');
    expect(request[0].request.params.get('event_id')).toBe(EVENT_ID);
    await flushBootstrap(context, undefined, undefined, request);

    expect(context.fixture.nativeElement.textContent).toContain('Cozinha');
    expect(context.fixture.nativeElement.textContent).toContain('Casamento da Ana');
  });

  it('mostra o separador Gestores de eventos só leitura com ligação por evento', async () => {
    const context = setup({ tab: 'gestores' });
    http = context.http;

    const managers = http.match((req) => req.url === `${BASE}/host/managers`);
    expect(managers.length).toBe(1);
    expect(managers[0].request.method).toBe('GET');
    await flushBootstrap(context, undefined, undefined, managers);

    const panel = context.fixture.nativeElement.querySelector('[data-testid="managers-panel"]');
    expect(panel).toBeTruthy();
    expect(panel.querySelectorAll('button').length).toBe(0);

    const link = context.fixture.nativeElement.querySelector(
      `[data-testid="manager-link-${EVENT_ID}"]`,
    );
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toContain(`/eventos/${EVENT_ID}`);
    expect(context.fixture.nativeElement.textContent).toContain('gestor@exemplo.pt');
  });

  it('mostra linha da equipa com contagens e última atividade', async () => {
    const context = setup();
    http = context.http;

    const request = http.match((req) => req.url === `${BASE}/host/teams`);
    expect(request.length).toBe(1);
    expect(request[0].request.method).toBe('GET');
    await flushBootstrap(context, undefined, undefined, request);

    const card = context.fixture.nativeElement.querySelector(
      `[data-testid="team-card-${TEAM_ID}"]`,
    );
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Cozinha');
    expect(card.textContent).toContain('Casamento da Ana');
    expect(card.textContent).toContain('3 membros');
    expect(card.textContent).toContain('2 por fazer');
    expect(card.textContent).toContain('Última atividade');
    expect(card.textContent).not.toContain('@');

    const list = context.fixture.nativeElement.querySelector('[data-testid="teams-list"]');
    expect(list).toBeTruthy();
  });

  it('abre detalhe da equipa e mostra detalhe do membro ao tocar no preview', async () => {
    const context = setup();
    http = context.http;
    const request = http.match((req) => req.url === `${BASE}/host/teams`);
    await flushBootstrap(context, undefined, undefined, request);

    const teamRow = context.fixture.nativeElement.querySelector(
      `[data-testid="team-card-${TEAM_ID}"]`,
    );
    teamRow.click();
    await settle(context.fixture);

    const memberButton = context.fixture.nativeElement.querySelector(
      '[data-testid="team-member-preview-member-2"]',
    );
    expect(memberButton).toBeTruthy();
    memberButton.click();

    const membersRequest = http.expectOne(
      (req) => req.url === `${BASE}/host/teams/${TEAM_ID}/members`,
    );
    expect(membersRequest.request.method).toBe('GET');
    membersRequest.flush(
      pageOf([
        {
          id: 'member-2',
          team_id: TEAM_ID,
          email: 'rui@exemplo.pt',
          phone: null,
          display_name: 'Rui Costa',
          role: 'membro',
          status: 'ativo',
          origin: 'email',
          is_host: false,
          open_task_count: 3,
          has_event_access: true,
          joined_at: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      ]),
    );
    await settle(context.fixture);

    const detail = context.fixture.nativeElement.querySelector('[data-testid="team-member-detail"]');
    expect(detail.textContent).toContain('Rui Costa');
    expect(detail.textContent).toContain('rui@exemplo.pt');
    expect(detail.textContent).toContain('3 por concluir');
  });
});
