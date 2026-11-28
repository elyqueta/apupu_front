import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicEntityCardComponent } from './public-entity-card.component';

@Component({
  imports: [PublicEntityCardComponent],
  template: `
    <app-public-entity-card
      [kind]="kind()"
      [name]="name()"
      [slug]="slug()"
      [description]="description()"
      [avatarUrl]="avatarUrl()"
      [coverUrl]="coverUrl()"
      [count]="count()"
    />
  `,
})
class HostComponent {
  readonly kind = signal<'community' | 'institution'>('community');
  readonly name = signal('Comunidade Teste Bloco 11');
  readonly slug = signal('comunidade-teste-bloco-11');
  readonly description = signal('Uma comunidade para jovens em Luanda.');
  readonly avatarUrl = signal<string | null>(null);
  readonly coverUrl = signal<string | null>(null);
  readonly count = signal(2);
}

describe('PublicEntityCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function native(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('usa contagens plurais, badge e um único botão "Ver"', () => {
    const card = native().querySelector('[data-testid="feed-community-comunidade-teste-bloco-11"]') as HTMLElement;
    expect(card.textContent).toContain('2 membros');
    expect(card.textContent).toContain('Pública');
    expect(card.querySelectorAll('a').length).toBe(1);
    expect(card.querySelector('a')?.textContent?.trim()).toBe('Ver');
    expect(card.className).toContain('h-full');
  });

  it('mostra iniciais por omissão e a capa real quando existe', () => {
    const card = native().querySelector('[data-testid="feed-community-comunidade-teste-bloco-11"]') as HTMLElement;
    expect(card.textContent).toContain('CT');

    fixture.componentInstance.avatarUrl.set('/avatars/community.png');
    fixture.componentInstance.coverUrl.set('/covers/community.png');
    fixture.detectChanges();
    expect(card.querySelector('img[src="/avatars/community.png"]')).not.toBeNull();
    expect(card.querySelector('img[src="/covers/community.png"]')).not.toBeNull();
  });

  it('reserva duas linhas para a descrição e usa o singular de comunidades em instituições', () => {
    const description = native().querySelector('p.line-clamp-2') as HTMLElement;
    expect(description.className).toContain('min-h-10');

    fixture.componentInstance.kind.set('institution');
    fixture.componentInstance.count.set(1);
    fixture.detectChanges();
    const card = native().querySelector('[data-testid="feed-institution-comunidade-teste-bloco-11"]') as HTMLElement;
    expect(card.textContent).toContain('1 comunidade');
    expect(card.textContent).toContain('Instituição');
    expect(card.querySelector('a')?.textContent?.trim()).toBe('Ver');
  });

  it('mantém as iniciais fora da capa com overflow', () => {
    const card = native().querySelector('[data-testid="feed-community-comunidade-teste-bloco-11"]') as HTMLElement;
    const cover = card.querySelector('div.h-32') as HTMLElement;
    const avatar = card.querySelector('span.size-14') as HTMLElement;

    expect(avatar.parentElement).toBe(card);
    expect(cover.parentElement).toBe(card);
    expect(cover.className).toContain('overflow-hidden');
    expect(card.className).toContain('relative');
    expect(card.className).not.toContain('overflow-hidden');
    expect(card.textContent).toContain('CT');
  });
});
