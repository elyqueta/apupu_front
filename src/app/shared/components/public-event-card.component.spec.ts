import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FeedEvent } from '../../core/data/social.repository';
import { PublicEventCardComponent } from './public-event-card.component';

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
  cover_url: '/flyers/gratitude.png',
  template: { id: 'constellation', palette: 'default', mode: 'light' },
  host_name: 'Ana',
  host_avatar_url: null,
  excerpt: 'Um encontro para crescer #jovens #gratidao #Luz',
  published_at: '2026-11-20T10:00:00.000Z',
  public_url: 'http://localhost:4200/e/abcDEF123456',
  slug: 'abcDEF123456',
  community: { name: 'Comunidade Teste Bloco 11', slug: 'comunidade-teste-bloco-11' },
  attendee_count: 3,
};

@Component({
  imports: [PublicEventCardComponent],
  template: `<app-public-event-card [event]="event()" [variant]="variant()" />`,
})
class HostComponent {
  readonly event = signal<FeedEvent>(EVENT);
  readonly variant = signal<'default' | 'compact'>('default');
}

describe('PublicEventCardComponent · modo cartaz', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.querySelectorAll('[data-testid="action-menu-panel"]').forEach((node) => node.remove());
  });

  function native(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra o flyer inteiro sem texto, selos ou gradientes por cima', () => {
    const flyer = native().querySelector('[data-testid="feed-event-flyer-ev1"]') as HTMLElement;
    const image = flyer.querySelector('img') as HTMLImageElement;
    expect(image).not.toBeNull();
    expect(image.className).toContain('object-contain');
    expect(image.className).not.toContain('object-cover');
    expect(flyer.querySelectorAll('h1, h2, h3, p, span, app-status-badge, button').length).toBe(0);
    expect(flyer.className).not.toContain('bg-gradient');
    expect(flyer.className).not.toContain('backdrop-blur');

    const status = native().querySelector('[data-testid="feed-event-status-ev1"]') as HTMLElement;
    expect(status).not.toBeNull();
    expect(status.className).toContain('text-brand-strong');
    expect(flyer.contains(status)).toBe(false);
  });

  it('abre o lightbox ao tocar no flyer e devolve o foco ao fechar', async () => {
    const flyer = native().querySelector('[data-testid="feed-event-flyer-ev1"]') as HTMLButtonElement;
    flyer.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const lightbox = native().querySelector('app-image-lightbox [role="dialog"]') as HTMLElement;
    expect(lightbox).not.toBeNull();
    expect(lightbox.querySelector('img')?.getAttribute('src')).toBe(EVENT.cover_url);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Fechar');

    (lightbox.querySelector('button[aria-label="Fechar"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(native().querySelector('app-image-lightbox [role="dialog"]')).toBeNull();
  });

  it('usa a miniatura do modelo quando não há capa', () => {
    fixture.componentInstance.event.set({ ...EVENT, cover_url: null });
    fixture.detectChanges();

    const flyer = native().querySelector('[data-testid="feed-event-flyer-ev1"]') as HTMLElement;
    expect(flyer.querySelector('img')).toBeNull();
    expect(flyer.querySelector('app-template-artwork')).not.toBeNull();
    expect(flyer.querySelector('app-template-artwork [data-artwork]')?.getAttribute('data-artwork')).toBe('cover');
  });

  it('mantém um único botão de opções de 44 px, sem círculo duplicado', () => {
    const options = native().querySelector('[data-testid="feed-event-options-ev1"]') as HTMLButtonElement;
    expect(options).not.toBeNull();
    expect(options.classList.contains('ui-icon-button')).toBe(true);
    expect(options.parentElement?.querySelectorAll('button').length).toBe(1);
    expect(options.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('mostra no máximo duas hashtags com contador de excedentes', () => {
    const tags = native().querySelector('[data-testid="feed-event-tags-ev1"]')?.textContent ?? '';
    expect(tags).toContain('#jovens');
    expect(tags).toContain('#gratidao');
    expect(tags).toContain('+1');
  });

  it('mantém o link "Ver evento" fora da imagem', () => {
    const flyer = native().querySelector('[data-testid="feed-event-flyer-ev1"]') as HTMLElement;
    const open = native().querySelector('[data-testid="feed-event-open-ev1"]') as HTMLAnchorElement;
    expect(open.getAttribute('href')).toBe('/e/abcDEF123456');
    expect(flyer.contains(open)).toBe(false);

    const react = native().querySelector('button[aria-label="Reagir"]') as HTMLButtonElement;
    const comment = native().querySelector('button[aria-label="Comentar"]') as HTMLButtonElement;
    expect(react.disabled).toBe(true);
    expect(comment.disabled).toBe(true);
    expect(react.title).toBeTruthy();
    expect(comment.title).toBeTruthy();
  });
});
