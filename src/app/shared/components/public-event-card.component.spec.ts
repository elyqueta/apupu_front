import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { FeedEvent } from '../../core/data/social.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { PublicEventCardComponent } from './public-event-card.component';
import { TemplateArtworkComponent } from './template-artwork.component';

const EVENT: FeedEvent = {
  type: 'event',
  id: 'ev1',
  title: 'Retiro de jovens',
  category: 'other',
  starts_at: '2027-01-10T15:00:00.000Z',
  ends_at: null,
  timezone: 'Africa/Luanda',
  status: 'published',
  location: 'Igreja',
  online: false,
  cover_url: null,
  template: { id: 'constellation', palette: 'default', mode: 'light' },
  host_name: 'Ana',
  public_url: 'http://localhost:4200/e/abcDEF123456',
  slug: 'abcDEF123456',
  community: null,
  attendee_count: 3,
};

@Component({
  imports: [PublicEventCardComponent],
  template: `
    <app-public-event-card [event]="event()" [variant]="variant()" />
  `,
})
class PublicEventCardHostComponent {
  readonly event = signal<FeedEvent>(EVENT);
  readonly variant = signal<'default' | 'compact'>('default');
}

describe('PublicEventCardComponent', () => {
  let fixture: ComponentFixture<PublicEventCardHostComponent>;
  let host: PublicEventCardHostComponent;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [PublicEventCardHostComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(PublicEventCardHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  function native(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function coverLink(): HTMLAnchorElement {
    return native().querySelector('[data-testid="feed-event-open-ev1"]') as HTMLAnchorElement;
  }

  function setEvent(overrides: Partial<FeedEvent>): void {
    host.event.set({ ...EVENT, ...overrides });
    fixture.detectChanges();
  }

  it('mostra a capa num img quando existe URL de capa', () => {
    setEvent({ cover_url: 'https://example.test/capa.jpg' });

    const image = coverLink().querySelector('img');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toBe('https://example.test/capa.jpg');
    expect(native().querySelector('app-template-artwork')).toBeNull();
  });

  it('usa a miniatura do modelo com o respetivo id quando não há capa', () => {
    setEvent({ cover_url: null, template: { ...EVENT.template, id: 'waves' } });

    const artwork = native().querySelector('app-template-artwork');
    expect(artwork).not.toBeNull();
    const instance = fixture.debugElement.query(By.directive(TemplateArtworkComponent))
      .componentInstance as TemplateArtworkComponent;
    expect(instance.templateId()).toBe('waves');
    expect(artwork?.querySelector('[data-artwork]')?.getAttribute('data-artwork')).toBe('cover');
  });

  it('mantém data e estado num cabeçalho flex dentro da capa, sem sobreposição absoluta no conteúdo', () => {
    const anchor = coverLink();
    const header = Array.from(anchor.children).find((child) =>
      child.classList.contains('pointer-events-none'),
    ) as HTMLElement;

    expect(header).toBeDefined();
    expect(header.parentElement).toBe(anchor);
    expect(header.classList.contains('flex')).toBe(true);
    expect(header.classList.contains('flex-wrap')).toBe(true);
    expect(header.classList.contains('items-start')).toBe(true);
    expect(header.classList.contains('justify-between')).toBe(true);
    expect(header.querySelector('app-status-badge')).not.toBeNull();
    expect(header.textContent).toContain(
      TestBed.inject(I18nService).dateTime(EVENT.starts_at, EVENT.timezone),
    );

    // Nenhum cabeçalho com deslocações absolutas partilhadas com o conteúdo.
    expect(header.className).not.toMatch(/-top-|-right-|left-3|right-3/);
    const content = Array.from(native().querySelector('article')?.children ?? []).find((child) =>
      child.classList.contains('p-4'),
    );
    expect(content?.querySelector('app-status-badge')).toBeNull();
    expect(content?.classList.contains('absolute')).toBe(false);
  });

  it('expõe a ligação com o testid feed-event-open-<id> apontando para /e/:slug', () => {
    const anchor = coverLink();
    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute('href')).toBe('/e/abcDEF123456');
  });
});
