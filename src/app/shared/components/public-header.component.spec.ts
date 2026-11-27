import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicHeaderComponent } from './public-header.component';

@Component({
  imports: [PublicHeaderComponent],
  template: `
    <app-public-header
      [signedIn]="signedIn()"
      [backLink]="backLink()"
      [backLabel]="backLabel()"
      [feedMode]="feedMode()"
      [unreadCount]="unreadCount()"
      (menu)="menuEvents.set(menuEvents() + 1)"
    />
  `,
})
class HostComponent {
  readonly signedIn = signal(false);
  readonly backLink = signal<string | null>('/');
  readonly backLabel = signal('');
  readonly feedMode = signal(false);
  readonly unreadCount = signal(0);
  readonly menuEvents = signal(0);
}

describe('PublicHeaderComponent', () => {
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

  function query(testId: string): HTMLElement | null {
    return native().querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  }

  it('mostra voltar, marca centrada e sino numa única linha móvel', () => {
    const header = native().querySelector('header') as HTMLElement;
    const mobileRow = header.children[0] as HTMLElement;
    const desktopRow = header.children[1] as HTMLElement;

    expect(mobileRow.className).toContain('sm:hidden');
    expect(mobileRow.className).toContain('h-14');
    expect(desktopRow.className).toContain('hidden');
    expect(desktopRow.className).toContain('sm:block');

    const back = query('public-header-back-mobile') as HTMLAnchorElement;
    expect(back).not.toBeNull();
    expect(back.getAttribute('href')).toBe('/');
    expect(back.textContent).toContain('Voltar');
    expect(back.className).toContain('min-h-11');
    expect(back.querySelector('fa-icon')).not.toBeNull();

    const logo = query('public-header-logo-mobile') as HTMLAnchorElement;
    expect(logo.className).toContain('absolute');
    expect(logo.className).toContain('left-1/2');
    expect(logo.getAttribute('href')).toBe('/');
    expect(query('public-header-notifications-mobile')?.getAttribute('href')).toBe('/entrar');

    // O mesmo botão de voltar continua disponível no cabeçalho desktop.
    expect(query('public-header-back')?.getAttribute('href')).toBe('/');
  });

  it('no feed troca "voltar" pelo menu e emite o clique', () => {
    fixture.componentInstance.feedMode.set(true);
    fixture.componentInstance.backLink.set(null);
    fixture.detectChanges();

    const menu = query('public-header-menu') as HTMLButtonElement;
    expect(menu).not.toBeNull();
    expect(query('public-header-back-mobile')).toBeNull();
    expect(query('public-header-logo-mobile')).not.toBeNull();

    menu.click();
    expect(fixture.componentInstance.menuEvents()).toBe(1);
  });

  it('liga o sino às notificações e mostra a contagem não lida', () => {
    fixture.componentInstance.signedIn.set(true);
    fixture.componentInstance.unreadCount.set(3);
    fixture.detectChanges();

    const bell = query('public-header-notifications-mobile') as HTMLAnchorElement;
    expect(bell.getAttribute('href')).toBe('/notificacoes');
    expect(bell.textContent).toContain('3');
  });
});
