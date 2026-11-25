import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { ApiTemplate } from '../../core/api/api.models';
import { TemplatesRepository } from '../../core/data/templates.repository';
import { TemplatesPage } from './templates.page';

const BASE = 'http://localhost:3000/api/v1';

function makeTemplate(overrides: Partial<ApiTemplate> & Pick<ApiTemplate, 'id' | 'slug' | 'name'>): ApiTemplate {
  return {
    description: `Descrição ${overrides.name}`,
    preview_image_url: null,
    supported_fields: ['title', 'starts_at'],
    themes: [{ mode: 'light', palette: 'default' }],
    is_active: true,
    kind: 'user',
    manifest: {
      version: 1,
      palette: { bg: '#FFFFFF', surface: '#F8FAFC', ink: '#111827', accent: '#2563EB', muted: '#6B7280' },
      fonts: { display: 'sans', body: 'sans' },
      ornaments: { frame: 'none', corners: 'none', divider: 'none' },
      layout: { align: 'center', blocks: ['title', 'host', 'datetime', 'location', 'message'] },
      cover: 'none',
      open_style: 'fade',
      pdf: { frame: 'none', qr_position: 'bottom-right', show_ornaments: false },
    },
    ...overrides,
  };
}

const TEMPLATES: ApiTemplate[] = [
  makeTemplate({ id: 't1', slug: 'gratitude', name: 'Gratitude', kind: 'system' }),
  makeTemplate({ id: 't2', slug: 'minimal', name: 'Minimal', kind: 'user' }),
];

async function settle(fixture: ComponentFixture<TemplatesPage>): Promise<void> {
  for (let pass = 0; pass < 3; pass += 1) {
    await fixture.whenStable();
    fixture.detectChanges();
  }
}

describe('TemplatesPage', () => {
  let fixture: ComponentFixture<TemplatesPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplatesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TemplatesPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    try {
      http?.match(() => true).forEach((req) => req.flush({ data: [] }));
      http?.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  function flushChrome(): void {
    http.match(`${BASE}/host/profile`).forEach((r) =>
      r.flush({ data: { id: 'u1', name: 'Host', email: 'h@a.co', avatar_url: null, phone: null, bio: null } }),
    );
    http.match(`${BASE}/host/activity?page=1&page_size=100`).forEach((r) => r.flush({ data: [] }));
    http.match((r) => r.url.startsWith(`${BASE}/host/events`)).forEach((r) =>
      r.flush({ data: [], meta: { page: 1, pageSize: 100, total: 0 } }),
    );
    http.match((r) => r.url.startsWith(`${BASE}/host/notifications`)).forEach((r) =>
      r.flush({ data: [], meta: { page: 1, pageSize: 8, total: 0, unread: 0 } }),
    );
  }

  async function flushTemplates(items: ApiTemplate[] = TEMPLATES): Promise<void> {
    flushChrome();
    const req = http.expectOne(`${BASE}/templates`);
    req.flush({ data: items });
    await settle(fixture);
  }

  it('abre e fecha o modal de pré-visualização e devolve o foco', async () => {
    await flushTemplates();
    const native = fixture.nativeElement as HTMLElement;
    const thumb = native.querySelector<HTMLButtonElement>('button[aria-label*="Gratitude"]');
    expect(thumb).not.toBeNull();
    thumb!.focus();
    thumb!.click();
    await settle(fixture);

    expect(document.querySelector('[data-testid="app-modal"]')).not.toBeNull();

    // Fechar por clique
    const close = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-testid="app-modal-footer"] button')).find(
      (b) => b.textContent?.trim().includes('Fechar'),
    );
    expect(close).not.toBeNull();
    close!.click();
    await settle(fixture);
    expect(document.querySelector('[data-testid="app-modal"]')).toBeNull();
    expect(document.activeElement).toBe(thumb);

    // Abrir e fechar por Escape
    thumb!.click();
    await settle(fixture);
    expect(document.querySelector('[data-testid="app-modal"]')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(fixture);
    expect(document.querySelector('[data-testid="app-modal"]')).toBeNull();
    expect(document.activeElement).toBe(thumb);
  });

  it('usa o modelo a partir do cartão e a partir do modal', async () => {
    await flushTemplates();
    const native = fixture.nativeElement as HTMLElement;

    const useCard = native.querySelector<HTMLButtonElement>('[data-testid="template-use-minimal"]');
    expect(useCard).not.toBeNull();
    useCard!.click();
    await settle(fixture);
    expect(useCard!.textContent).toContain('Selecionado');

    const thumb = native.querySelector<HTMLButtonElement>('button[aria-label*="Gratitude"]');
    thumb!.click();
    await settle(fixture);
    const useModal = document.querySelector<HTMLButtonElement>('[data-testid="template-modal-use-gratitude"]');
    expect(useModal).not.toBeNull();
    useModal!.click();
    await settle(fixture);
    expect(document.querySelector('[data-testid="app-modal"]')).toBeNull();
    const gratitudeCardUse = native.querySelector<HTMLButtonElement>('[data-testid="template-use-gratitude"]');
    expect(gratitudeCardUse!.textContent).toContain('Selecionado');
  });

  it('mantém grelha estável ao acrescentar templates', async () => {
    await flushTemplates();
    const native = fixture.nativeElement as HTMLElement;
    const gridBefore = native.querySelector('.grid.grid-cols-1') as HTMLElement | null;
    expect(gridBefore).not.toBeNull();
    expect(gridBefore!.className).toContain('sm:grid-cols-2');
    expect(gridBefore!.className).toContain('lg:grid-cols-3');
    expect(gridBefore!.className).toContain('xl:grid-cols-4');

    const extra = Array.from({ length: 6 }, (_, i) =>
      makeTemplate({ id: `tx${i}`, slug: `extra-${i}`, name: `Extra ${i}` }),
    );
    const repo = TestBed.inject(TemplatesRepository);
    const load = repo.load({ force: true });
    http.expectOne(`${BASE}/templates`).flush({ data: [...TEMPLATES, ...extra] });
    await load;
    await settle(fixture);

    const gridAfter = native.querySelector('.grid.grid-cols-1') as HTMLElement | null;
    expect(gridAfter).not.toBeNull();
    expect(gridAfter!.className).toContain('sm:grid-cols-2');
    expect(gridAfter!.className).toContain('lg:grid-cols-3');
    expect(gridAfter!.className).toContain('xl:grid-cols-4');
    expect(native.querySelectorAll('article.h-full').length).toBe(TEMPLATES.length + extra.length);
    expect(native.querySelectorAll('button.aspect-\\[4\\/3\\]').length).toBe(TEMPLATES.length + extra.length);
  });
});
