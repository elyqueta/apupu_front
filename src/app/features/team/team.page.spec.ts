import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-config';
import { ApiHostEventManager, ApiTeam } from '../../core/api/api.models';
import { ToastService } from '../../core/services/toast.service';
import { AvatarStackComponent } from '../../shared/components/avatar-stack.component';
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

describe('TeamPage', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http?.verify();
    vi.restoreAllMocks();
  });

  it('cria nova equipa pelo modal e navega para o detalhe', async () => {
    const context = setup({ evento: EVENT_ID });
    http = context.http;

    const initial = http.expectOne((req) => req.url === `${BASE}/host/teams`);
    expect(initial.request.params.get('event_id')).toBe(EVENT_ID);
    initial.flush(pageOf([teamFixture({ name: 'Cozinha antiga' })]));
    await tick();
    await settle(context.fixture);

    const newButton = context.fixture.nativeElement.querySelector('[data-testid="new-team"]');
    newButton.click();
    context.fixture.detectChanges();

    const name = context.fixture.nativeElement.querySelector('[data-testid="team-form-name"]');
    name.value = 'Cozinha nova';
    name.dispatchEvent(new Event('input'));
    context.fixture.detectChanges();

    const submit = context.fixture.nativeElement.querySelector('[data-testid="team-form-submit"]');
    expect(submit.disabled).toBe(false);
    submit.click();

    const create = http.expectOne(`${BASE}/host/teams`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      event_id: EVENT_ID,
      name: 'Cozinha nova',
      category: 'outra',
      description: null,
    });
    create.flush({ data: teamFixture({ id: TEAM_ID, name: 'Cozinha nova' }) });
    await tick();
    await settle(context.fixture);

    expect(context.navigate).toHaveBeenCalledWith(['/equipas', TEAM_ID]);
    expect(context.toasts.messages().some((message) => message.message.includes('Equipa criada'))).toBe(
      true,
    );
  });

  it('filtra a lista por evento via ?evento=', async () => {
    const context = setup({ evento: EVENT_ID });
    http = context.http;

    const request = http.expectOne((req) => req.url === `${BASE}/host/teams`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('event_id')).toBe(EVENT_ID);
    request.flush(pageOf([teamFixture()]));
    await tick();
    await settle(context.fixture);

    expect(context.fixture.nativeElement.textContent).toContain('Cozinha');
    expect(context.fixture.nativeElement.textContent).toContain('Casamento da Ana');
  });

  it('mostra o separador Gestores de eventos só leitura com ligação por evento', async () => {
    const context = setup({ tab: 'gestores' });
    http = context.http;

    const managers = http.expectOne(`${BASE}/host/managers`);
    managers.flush({ data: [managerFixture()] });
    await tick();
    await settle(context.fixture);

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

  it('mostra barra x/y concluídas e pilha de avatares no cartão', async () => {
    const context = setup();
    http = context.http;

    const request = http.expectOne((req) => req.url === `${BASE}/host/teams`);
    request.flush(pageOf([teamFixture()]));
    await tick();
    await settle(context.fixture);

    const progress = context.fixture.nativeElement.querySelector(
      `[data-testid="team-progress-${TEAM_ID}"]`,
    );
    expect(progress.textContent).toContain('5/7 concluídas');
    const bar = progress.querySelector('[role="progressbar"] > div');
    expect(bar.getAttribute('style')).toMatch(/width/);

    const avatars = context.fixture.nativeElement.querySelector(
      `[data-testid="team-avatars-${TEAM_ID}"] app-avatar-stack`,
    );
    expect(avatars).toBeTruthy();
    expect(
      context.fixture.debugElement.queryAll((debug) => debug.componentInstance instanceof AvatarStackComponent)
        .length,
    ).toBeGreaterThan(0);
    expect(context.fixture.nativeElement.querySelector(`[data-testid="team-card-${TEAM_ID}"]`).textContent).not.toContain(
      '@',
    );
  });
});
