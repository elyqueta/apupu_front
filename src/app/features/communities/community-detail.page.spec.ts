import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import {
  ApiCommunityActivity,
  ApiCommunityDetail,
  ApiCommunityEvent,
  ApiCommunityTeam,
  ApiEventSuggestion,
  shareUrl,
} from '../../core/data/communities.repository';
import { CommunityDetailPage } from './community-detail.page';

const BASE = 'http://localhost:3000/api/v1';
const SLUG = 'ministerio-jovem';
const COMMUNITY_ID = 'c1';
const ACTIVITY_URL = `${BASE}/host/communities/${COMMUNITY_ID}/activity`;
const SUGGESTIONS_URL = `${BASE}/host/communities/${COMMUNITY_ID}/event-suggestions`;

function detail(overrides: Partial<ApiCommunityDetail> = {}): ApiCommunityDetail {
  return {
    community: {
      id: COMMUNITY_ID,
      name: 'Ministério Jovem',
      slug: SLUG,
      description: 'Adolescentes',
      visibility: 'public',
      avatar_url: null,
      cover_url: null,
      member_count: 3,
      event_count: 1,
      team_count: 0,
      my_role: null,
      my_status: null,
      my_pending_request: false,
      url: `http://localhost:4200/comunidades/${SLUG}`,
      created_at: '2026-11-24T00:00:00.000Z',
    },
    permissions: {
      canEdit: false,
      canDelete: false,
      canInvite: false,
      canDecideRequests: false,
      canChangeRoles: false,
      canLeave: false,
      canCreateEvent: false,
      canCreateTeam: false,
      canShare: false,
      canViewAllReferrals: false,
      canTransfer: false,
      canRequestToJoin: true,
      canSuggestEvent: false,
      canDecideEventSuggestions: false,
      isMember: false,
      isInvited: false,
    },
    my_ref_code: null,
    events: [],
    teams: [],
    members: [],
    pending_requests: 0,
    transfer: null,
    ...overrides,
  };
}

function activeMember(overrides: Partial<ApiCommunityDetail> = {}): ApiCommunityDetail {
  return detail({
    community: { ...detail().community, my_role: 'member', my_status: 'active' },
    permissions: {
      ...detail().permissions,
      canSuggestEvent: true,
      canLeave: true,
      canRequestToJoin: false,
      isMember: true,
    },
    ...overrides,
  });
}

function staff(overrides: Partial<ApiCommunityDetail> = {}): ApiCommunityDetail {
  const base = activeMember();
  return detail({
    ...base,
    community: { ...base.community, my_role: 'owner' },
    permissions: {
      ...base.permissions,
      canEdit: true,
      canInvite: true,
      canDecideRequests: true,
      canChangeRoles: true,
      canShare: true,
      canDecideEventSuggestions: true,
    },
    ...overrides,
  });
}

function suggestion(overrides: Partial<ApiEventSuggestion> = {}): ApiEventSuggestion {
  return {
    id: 's1',
    host_id: 'h1',
    display_name: 'Ana Silva',
    avatar_url: null,
    title: 'Festa da comunidade',
    message: 'Podemos fazer no parque?',
    status: 'pending',
    event_id: null,
    decided_at: null,
    created_at: '2026-11-25T10:00:00.000Z',
    updated_at: '2026-11-25T10:00:00.000Z',
    ...overrides,
  };
}

function activity(overrides: Partial<ApiCommunityActivity> = {}): ApiCommunityActivity {
  return {
    id: 'a1',
    community_id: COMMUNITY_ID,
    host_id: 'h1',
    host_name: 'Ana Silva',
    host_avatar_url: null,
    event_id: 'e1',
    event_title: 'Encontro de jovens',
    event_slug: 'encontro-de-jovens',
    created_at: '2026-11-26T10:00:00.000Z',
    ...overrides,
  };
}

function communityEvent(): ApiCommunityEvent {
  return {
    id: 'ev9',
    title: 'Encontro partilhado',
    starts_at: '2027-02-10T15:00:00.000Z',
    status: 'published',
    visibility: 'public',
    public_url: 'http://localhost:4200/e/partilhado',
    cover_url: null,
    accepted_count: 4,
  };
}

function communityTeam(): ApiCommunityTeam {
  return { id: 't1', name: 'Cozinha', category: 'other', member_count: 3, event_count: 2 };
}

function setup(): { fixture: ComponentFixture<CommunityDetailPage>; http: HttpTestingController } {
  TestBed.configureTestingModule({
    imports: [CommunityDetailPage],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(CommunityDetailPage);
  fixture.componentRef.setInput('slug', SLUG);
  fixture.detectChanges();
  return { fixture, http };
}

async function settle(fixture: ComponentFixture<CommunityDetailPage>): Promise<void> {
  for (let pass = 0; pass < 2; pass += 1) {
    await fixture.whenStable();
    fixture.detectChanges();
  }
}

function openTab(fixture: ComponentFixture<CommunityDetailPage>, tab: string): void {
  const native = fixture.nativeElement as HTMLElement;
  const button = native.querySelector(`[data-testid="community-tab-${tab}"]`) as HTMLButtonElement;
  expect(button).not.toBeNull();
  button.click();
  fixture.detectChanges();
}

/** As cargas disparadas depois de um `await` só chegam ao backend no microtask seguinte. */
async function flushPending(
  http: HttpTestingController,
  url: string,
  body: object,
): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const requests = http.match(url);
    if (requests.length > 0) {
      requests.forEach((request) => request.flush(body));
      return;
    }
    await Promise.resolve();
  }
  throw new Error(`Nenhum pedido pendente para ${url}`);
}

describe('CommunityDetailPage', () => {
  let http: HttpTestingController;

  afterEach(() => {
    try {
      http?.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  it('visitante de comunidade pública vê "Pedir para entrar" e só um pedido é feito', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/communities/${SLUG}`).flush({ data: detail() });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="community-join"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="community-tab-members"]')).toBeNull();
    expect(native.querySelector('[data-testid="community-activity"]')).toBeNull();
    // Sem ciclos: nenhum pedido extra depois de estabilizar.
    http.expectNone(`${BASE}/host/communities/${SLUG}`);
  });

  it('gestor vê pedidos e definições; membro comum não', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/communities/${SLUG}`).flush({
      data: detail({
        permissions: {
          ...detail().permissions,
          canEdit: true,
          canInvite: true,
          canDecideRequests: true,
          canLeave: true,
          canShare: true,
          canRequestToJoin: false,
          isMember: true,
        },
      }),
    });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="community-tab-requests"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="community-tab-settings"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="community-join"]')).toBeNull();
  });

  it('edição da comunidade mostra os controlos de imagem com o estilo de botão primário', async () => {
    const base = staff();
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/communities/${SLUG}`).flush({
      data: staff({
        community: {
          ...base.community,
          cover_url: 'https://example.com/cover.jpg',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      }),
    });
    await flushPending(http, ACTIVITY_URL, { data: [] });
    await settle(context.fixture);
    openTab(context.fixture, 'settings');
    const native = context.fixture.nativeElement as HTMLElement;
    (native.querySelector('[data-testid="community-edit"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();
    const dialog = native.querySelector('app-community-form-dialog') as HTMLElement;
    expect(dialog).not.toBeNull();
    const uploads = Array.from(dialog.querySelectorAll<HTMLInputElement>('input[type="file"]')).map(
      (input) => input.closest('label') as HTMLLabelElement,
    );
    expect(uploads.length).toBe(2);
    const removes = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button.size-9'));
    expect(removes.length).toBe(2);
    for (const label of uploads) {
      expect(label.className).toContain('bg-brand');
      expect(label.className).toContain('text-on-secondary');
      expect(label.className).toContain('hover:bg-secondary-hover');
      expect(label.className).toContain('focus-within:ring-brand/60');
      expect(label.className).not.toContain('bg-[#0a2b2c]/40');
      expect((label.querySelector('input') as HTMLInputElement).disabled).toBe(false);
    }
    for (const button of removes) {
      expect(button.className).toContain('bg-surface');
      expect(button.className).toContain('text-coral');
      expect(button.className).toContain('hover:bg-coral/10');
      expect(button.className).toContain('focus-visible:ring-coral/60');
      expect(button.className).not.toContain('bg-[#0a2b2c]/40');
    }
  });

  it('todas as abas usam a mesma família visual com destaque só na selecionada', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/communities/${SLUG}`).flush({ data: staff() });
    await flushPending(http, ACTIVITY_URL, { data: [] });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    const tabs = () => Array.from(native.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const assertStyles = (): void => {
      for (const button of tabs()) {
        const classes = button.className;
        expect(classes).toContain('text-ink');
        expect(classes).not.toContain('text-muted');
        expect(classes).not.toContain('opacity-');
        expect(button.querySelector('span')?.className ?? '').not.toContain('text-muted');
        if (button.getAttribute('aria-selected') === 'true') {
          expect(classes).toContain('border-brand/30');
          expect(classes).toContain('bg-brand/15');
          expect(classes).not.toContain('bg-surface');
        } else {
          expect(classes).toContain('border-line');
          expect(classes).toContain('bg-surface');
          expect(classes).toContain('hover:border-brand/30');
          expect(classes).toContain('hover:bg-brand/10');
          expect(classes).not.toContain('bg-brand/15');
        }
      }
    };
    expect(tabs().length).toBeGreaterThan(1);
    assertStyles();
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    openTab(context.fixture, 'settings');
    assertStyles();
    expect(tabs().find((button) => button.getAttribute('aria-selected') === 'true')?.getAttribute('data-testid')).toBe('community-tab-settings');
  });

  it('comunidade privada sem acesso mostra "não encontrada"', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/communities/${SLUG}`).flush(
      { error: { code: 'community_not_found', message: 'x', request_id: 'r' } },
      { status: 404, statusText: 'Not Found' },
    );
    await settle(context.fixture);
    expect(context.fixture.nativeElement.querySelector('[data-testid="community-not-found"]')).not.toBeNull();
  });

  it('membro ativo vê "Sugerir evento" e abre o assistente com o slug da comunidade', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/communities/${SLUG}`).flush({ data: activeMember() });
    await flushPending(http, ACTIVITY_URL, { data: [] });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="community-suggest-event"]')).toBeNull();
    openTab(context.fixture, 'events');
    expect(native.querySelector('[data-testid="community-suggest-event"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="community-new-event"]')).toBeNull();
    expect(native.querySelector('[data-testid="community-suggestions"]')).toBeNull();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    (native.querySelector('[data-testid="community-suggest-event"]') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith(['/criar-evento'], { queryParams: { community: SLUG } });
    await settle(context.fixture);
  });

  it('membro ativo vê a atividade recente com link para o evento', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/communities/${SLUG}`).flush({ data: activeMember() });
    await flushPending(http, ACTIVITY_URL, { data: [activity()] });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="community-activity-item"]')).not.toBeNull();
    expect(native.textContent).toContain('Ana Silva');
    expect(native.textContent).toContain('Encontro de jovens');
    const link = native.querySelector('[data-testid="community-activity-event"]') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/e/encontro-de-jovens');
    http.expectNone(ACTIVITY_URL);
  });

  it('reutiliza o cartão de evento do feed e a linha de equipa da gestão', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/communities/${SLUG}`).flush({
      data: activeMember({ events: [communityEvent()], teams: [communityTeam()] }),
    });
    await flushPending(http, ACTIVITY_URL, { data: [] });
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="community-event-ev9"] app-public-event-card')).not.toBeNull();
    expect(native.textContent).toContain('Encontro partilhado');

    openTab(context.fixture, 'teams');
    const team = native.querySelector('[data-testid="community-team-t1"]') as HTMLElement;
    expect(team).not.toBeNull();
    expect(team.textContent).toContain('Cozinha');
    expect(team.textContent).toContain('3 membros');
    expect(native.querySelector('[data-testid="community-teams-list"] app-team-card')).not.toBeNull();

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    team.click();
    expect(navigate).toHaveBeenCalledWith(['/equipas', 't1']);
  });

  it('staff revê sugestões pendentes e aprova, recarregando detalhe e eventos', async () => {
    const context = setup();
    http = context.http;
    const reviewed = staff({ pending_event_suggestions: 1 });
    http.expectOne(`${BASE}/host/communities/${SLUG}`).flush({ data: reviewed });
    await flushPending(http, ACTIVITY_URL, { data: [] });
    await settle(context.fixture);
    openTab(context.fixture, 'events');
    await flushPending(http, SUGGESTIONS_URL, { data: [suggestion()] });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="community-suggestions"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="community-suggestions-count"]')?.textContent).toContain('1');
    expect(native.textContent).toContain('Festa da comunidade');
    expect(native.textContent).toContain('Podemos fazer no parque?');

    (native.querySelector('[data-testid="community-suggestion-approve-s1"]') as HTMLButtonElement).click();
    const decision = http.expectOne(`${SUGGESTIONS_URL}/s1/decision`);
    expect(decision.request.body).toEqual({ decision: 'approve' });
    decision.flush({ data: suggestion({ status: 'approved' }) });
    // A decisão recarrega o detalhe (eventos) e a lista de sugestões.
    await flushPending(http, `${BASE}/host/communities/${SLUG}`, { data: staff() });
    await flushPending(http, ACTIVITY_URL, { data: [] });
    await flushPending(http, SUGGESTIONS_URL, { data: [] });
    await settle(context.fixture);
    expect(native.querySelector('[data-testid="community-suggestions-empty"]')).not.toBeNull();
  });

  it('staff pode recusar uma sugestão', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/communities/${SLUG}`).flush({ data: staff({ pending_event_suggestions: 1 }) });
    await flushPending(http, ACTIVITY_URL, { data: [] });
    await settle(context.fixture);
    openTab(context.fixture, 'events');
    await flushPending(http, SUGGESTIONS_URL, { data: [suggestion()] });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    (native.querySelector('[data-testid="community-suggestion-reject-s1"]') as HTMLButtonElement).click();
    const decision = http.expectOne(`${SUGGESTIONS_URL}/s1/decision`);
    expect(decision.request.body).toEqual({ decision: 'reject' });
    decision.flush({ data: suggestion({ status: 'rejected' }) });
    await flushPending(http, `${BASE}/host/communities/${SLUG}`, { data: staff() });
    await flushPending(http, ACTIVITY_URL, { data: [] });
    await flushPending(http, SUGGESTIONS_URL, { data: [] });
    await settle(context.fixture);
  });
});

describe('shareUrl', () => {
  it('acrescenta o código de partilha ao link aberto', () => {
    expect(shareUrl('http://x/e/abc', 'REF123')).toBe('http://x/e/abc?ref=REF123');
    expect(shareUrl('http://x/e/abc?a=1', 'REF123')).toBe('http://x/e/abc?a=1&ref=REF123');
    expect(shareUrl('http://x/e/abc', null)).toBe('http://x/e/abc');
  });
});
