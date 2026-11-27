import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { FeedCommunity, FeedEvent, FeedInstitution, FeedPerson } from '../../core/data/social.repository';
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

describe('FeedPage', () => {
  let http: HttpTestingController;
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
});
