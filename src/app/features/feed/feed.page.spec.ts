import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { FeedCommunity, FeedEvent, FeedInstitution, FeedPerson } from '../../core/data/social.repository';
import { SearchService } from '../../core/services/search.service';
import { FeedPage } from './feed.page';

const BASE = 'http://localhost:3000/api/v1';

const event: FeedEvent = {
  type: 'event',
  id: 'ev1',
  title: 'Retiro de jovens',
  category: 'other',
  starts_at: '2027-01-10T15:00:00.000Z',
  ends_at: null,
  timezone: 'Africa/Luanda',
  location: 'Igreja',
  online: false,
  cover_url: null,
  template: { id: null, palette: 'default', mode: 'light' },
  host_name: 'Ana',
  public_url: 'http://localhost:4200/e/abcDEF123456',
  slug: 'abcDEF123456',
  community: null,
};

const person: FeedPerson = { type: 'person', id: 'p1', display_name: 'Rui', avatar_url: null, cover_url: null };

const communityItem: FeedCommunity = {
  type: 'community',
  id: 'c1',
  name: 'Comunidade Teste',
  slug: 'comunidade-teste',
  description: null,
  avatar_url: null,
  cover_url: null,
  member_count: 2,
};

const institutionItem: FeedInstitution = {
  type: 'institution',
  id: 'i1',
  name: 'Instituição Teste',
  slug: 'instituicao-teste',
  description: null,
  avatar_url: null,
  cover_url: null,
  community_count: 3,
};

function setup(): { fixture: ComponentFixture<FeedPage>; http: HttpTestingController } {
  TestBed.configureTestingModule({
    imports: [FeedPage],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: BASE },
      // Em "server" não restaura sessão nem carrega a faixa de comunidades.
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(FeedPage);
  fixture.detectChanges();
  return { fixture, http };
}

async function settle(fixture: ComponentFixture<FeedPage>): Promise<void> {
  // "Todos" resolve três pedidos em Promise.all: são precisos vários ciclos
  // para que o resultado das três promessas chegue à template.
  for (let pass = 0; pass < 5; pass += 1) {
    await fixture.whenStable();
    fixture.detectChanges();
  }
}

/** O separador "Todos" carrega os três tipos em paralelo. */
function flushFeed(
  http: HttpTestingController,
  type: 'events' | 'communities' | 'people',
  items: unknown[] = [],
  nextCursor: string | null = null,
): void {
  http
    .expectOne((req) => req.url === `${BASE}/public/feed` && req.params.get('type') === type)
    .flush({ data: { items, next_cursor: nextCursor } });
}

/** Abre a folha de pesquisa já com o feed carregado. */
async function openSearch(fixture: ComponentFixture<FeedPage>): Promise<HTMLInputElement> {
  (fixture.nativeElement.querySelector('[data-testid="feed-search-open"]') as HTMLButtonElement).click();
  fixture.detectChanges();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  return fixture.nativeElement.querySelector('[data-testid="feed-search-input"]') as HTMLInputElement;
}

function type(input: HTMLInputElement, value: string, fixture: ComponentFixture<FeedPage>): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
}

/** O debounce da pesquisa global é de 250 ms. */
async function waitDebounce(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
}

describe('FeedPage', () => {
  let http: HttpTestingController;
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    try {
      http?.verify();
    } finally {
      // Mesmo se uma verificação falhar, o TestBed tem de ser reiniciado
      // para que o próximo teste possa configurar o módulo novamente.
      TestBed.resetTestingModule();
    }
  });

  it('visitante vê eventos públicos, a faixa de convite e "Ver evento" aponta para /e/:slug', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events', [event]);
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="feed-visitor-banner"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="feed-signup"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="feed-event-open-ev1"]')?.getAttribute('href')).toBe('/e/abcDEF123456');
    expect(native.querySelector('[data-testid="feed-load-more"]')).toBeNull();
  });

  it('mostra a navegação inferior com rótulos e estado ativo', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events');
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);

    const nav = (context.fixture.nativeElement as HTMLElement).querySelector('[data-testid="feed-bottom-nav"]') as HTMLElement;
    const labels = [...nav.querySelectorAll('span')].map((node) => node.textContent?.trim());
    expect(labels).toEqual(['Início', 'Explorar', 'Criar', 'Comunidades', 'Entrar']);
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toContain('Início');
    expect((context.fixture.nativeElement as HTMLElement).querySelector('[data-testid="feed-menu"]')).not.toBeNull();
  });

  it('abre as categorias num modal em vez de uma segunda fila de chips', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events');
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    (native.querySelector('[data-testid="feed-categories-open"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();
    expect(native.querySelector('[data-testid="feed-categories-modal"]')).not.toBeNull();
    expect((native.querySelector('[data-testid="feed-categories-modal"]') as HTMLElement).textContent).toContain('Todas');
  });

  it('mantém a pesquisa visível abaixo do cabeçalho e remove o atalho perdido do painel', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events', [event]);
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    const sticky = native.querySelector('[data-testid="feed-search-open"]')?.closest('.sticky') as HTMLElement;
    expect(sticky).not.toBeNull();
    expect(sticky.className).toContain('bg-canvas');
    expect(sticky.className).toContain('sm:top-[4.0625rem]');
    expect(native.querySelector('[data-testid="feed-dashboard"]')).toBeNull();
    expect(native.textContent).not.toContain('Ir para o painel');
  });

  it('mostra o filtro e o chip "Todas" com fundo sólido em vez de tint escuro', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events');
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    const filter = native.querySelector('[data-testid="feed-categories-open"]') as HTMLButtonElement;
    expect(filter.className).toContain('bg-surface');
    expect(filter.className).toContain('text-ink');

    const all = [...native.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Todas',
    ) as HTMLButtonElement;
    expect(all).not.toBeNull();
    expect(all.className).toContain('bg-surface');
    expect(all.className).not.toContain('bg-brand/15');
  });

  it('escreve a data por extenso na coluna de próximos eventos', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events', [event]);
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);

    const page = context.fixture.componentInstance as unknown as {
      eventLongDate(value: FeedEvent): string;
    };
    const label = page.eventLongDate(event);
    expect(label).toContain('janeiro');
    expect(label).toContain('2027');
    expect(label).toContain('·');
  });

  it('dá aos cartões de comunidade e instituição a mesma largura da grelha', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events');
    flushFeed(http, 'communities', [institutionItem, communityItem]);
    flushFeed(http, 'people');
    await settle(context.fixture);

    const cards = [
      ...(context.fixture.nativeElement as HTMLElement).querySelectorAll('app-public-entity-card'),
    ] as HTMLElement[];
    expect(cards.length).toBe(2);
    cards.forEach((card) => expect(card.className).toContain('w-full'));
  });

  it('esconde a faixa de stories quando só existiria o botão "Criar"', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events');
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);

    expect((context.fixture.nativeElement as HTMLElement).querySelector('[data-testid="feed-strip"]')).toBeNull();
  });

  it('sem conta, abrir uma pessoa mostra o convite a criar conta', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events');
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);
    (context.fixture.nativeElement.querySelector('[data-testid="feed-type-people"]') as HTMLButtonElement).click();
    await settle(context.fixture);
    flushFeed(http, 'people', [person], 'MTI');
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="feed-load-more"]')).not.toBeNull();
    const personCard = native.querySelector('app-feed-person-card') as HTMLElement;
    expect(personCard.className).toContain('w-full');
    (native.querySelector('[data-testid="feed-person-p1"] button') as HTMLButtonElement).click();
    await settle(context.fixture);
    expect(document.body.querySelector('[data-testid="feed-gate"]')).not.toBeNull();
  });

  it('abre a pesquisa com combobox, lista de sugestões e foco no campo', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events', [event]);
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);

    const input = await openSearch(context.fixture);
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-controls')).toBe('feed-search-suggestions');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(input);

    const list = context.fixture.nativeElement.querySelector('#feed-search-suggestions');
    expect(list?.getAttribute('role')).toBe('listbox');
    expect(list?.textContent).toContain('Eventos');
    expect(list?.textContent).toContain('Retiro de jovens');
  });

  it('agrupa os resultados em tempo real depois do debounce', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events');
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);

    const input = await openSearch(context.fixture);
    type(input, 'rui', context.fixture);
    http.expectNone((req) => req.url === `${BASE}/public/search`);

    await waitDebounce();
    http
      .expectOne((req) => req.url === `${BASE}/public/search` && req.params.get('q') === 'rui')
      .flush({ data: { events: [], communities: [], people: [person] } });
    await settle(context.fixture);

    const list = context.fixture.nativeElement.querySelector('#feed-search-suggestions') as HTMLElement;
    expect(list.textContent).toContain('Pessoas');
    expect(list.textContent).toContain('Rui');
    expect(list.querySelector('[role="option"]')?.id).toContain('feed-person:p1');
  });

  it('mostra o estado de letras mínimas sem pedir resultados', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events');
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);

    const input = await openSearch(context.fixture);
    type(input, 'r', context.fixture);
    expect(context.fixture.nativeElement.textContent).toContain('Escreva pelo menos 2 letras.');
    await waitDebounce();
    http.expectNone((req) => req.url === `${BASE}/public/search`);
  });

  it('navega por setas, escolhe com Enter e fecha com Escape', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events');
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const input = await openSearch(context.fixture);
    type(input, 'retiro', context.fixture);
    await waitDebounce();
    http
      .expectOne((req) => req.url === `${BASE}/public/search`)
      .flush({ data: { events: [event], communities: [], people: [] } });
    await settle(context.fixture);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    context.fixture.detectChanges();
    const activeId = input.getAttribute('aria-activedescendant');
    expect(activeId).toBe('feed-event:ev1');
    expect(document.getElementById(activeId as string)?.getAttribute('aria-selected')).toBe('true');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    context.fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/e', 'abcDEF123456'], { queryParams: undefined });
    expect(context.fixture.nativeElement.querySelector('[data-testid="feed-search-input"]')).toBeNull();

    const again = await openSearch(context.fixture);
    type(again, 'a', context.fixture);
    again.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    context.fixture.detectChanges();
    expect(context.fixture.nativeElement.querySelector('[data-testid="feed-search-input"]')).toBeNull();
  });

  it('mostra pesquisas recentes partilhadas com a shell e permite limpar', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events');
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);
    TestBed.inject(SearchService).rememberSearch('retiro');

    await openSearch(context.fixture);
    const list = context.fixture.nativeElement.querySelector('#feed-search-suggestions') as HTMLElement;
    expect(list.textContent).toContain('Pesquisas recentes');
    expect(list.textContent).toContain('retiro');

    const clear = [...list.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Limpar',
    ) as HTMLButtonElement;
    expect(clear).toBeTruthy();
    clear.click();
    context.fixture.detectChanges();
    expect(context.fixture.nativeElement.querySelector('#feed-search-suggestions')?.textContent).not.toContain(
      'Pesquisas recentes',
    );
  });

  it('ao escolher uma pessoa sem sessão mantém o convite a criar conta', async () => {
    const context = setup();
    http = context.http;
    flushFeed(http, 'events');
    flushFeed(http, 'communities');
    flushFeed(http, 'people');
    await settle(context.fixture);

    const input = await openSearch(context.fixture);
    type(input, 'rui', context.fixture);
    await waitDebounce();
    http
      .expectOne((req) => req.url === `${BASE}/public/search`)
      .flush({ data: { events: [], communities: [], people: [person] } });
    await settle(context.fixture);

    (context.fixture.nativeElement.querySelector('#feed-search-suggestions [role="option"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();
    expect(document.body.querySelector('[data-testid="feed-gate"]')).not.toBeNull();
    expect(context.fixture.nativeElement.querySelector('[data-testid="feed-search-input"]')).toBeNull();
  });
});
