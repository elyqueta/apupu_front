import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { FeedEvent, FeedPerson } from '../../core/data/social.repository';
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
    (native.querySelector('[data-testid="feed-person-p1"] button') as HTMLButtonElement).click();
    await settle(context.fixture);
    expect(document.body.querySelector('[data-testid="feed-gate"]')).not.toBeNull();
  });
});
