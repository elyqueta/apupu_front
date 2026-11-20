import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';
import { AuthLayoutComponent } from './auth-layout.component';

function mediaQuery(matches: boolean): MediaQueryList {
  return {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  } as MediaQueryList;
}

describe('AuthLayoutComponent · Bloco 7', () => {
  let fixture: ComponentFixture<AuthLayoutComponent>;

  beforeEach(() => {
    localStorage.setItem('contacomigo.locale', 'pt-AO');
    localStorage.setItem('contacomigo.theme', 'light');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(mediaQuery(false)),
    });
    TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    fixture = TestBed.createComponent(AuthLayoutComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(I18nService).setLocale('pt-AO');
    TestBed.inject(ThemeService).setMode('light');
    fixture?.destroy();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'matchMedia');
    localStorage.removeItem('contacomigo.locale');
    localStorage.removeItem('contacomigo.theme');
  });

  it('tem um botão de idioma funcional que traduz o hero', () => {
    const root: HTMLElement = fixture.nativeElement;
    const toggle = root.querySelector<HTMLButtonElement>('[data-testid="auth-language-toggle"]');

    expect(toggle).toBeTruthy();
    expect(toggle?.getAttribute('aria-label')).toBe('Idioma');
    expect(toggle?.textContent).toContain('PT');
    expect(root.textContent).toContain('Organiza. Convida. Celebra.');

    toggle?.click();
    fixture.detectChanges();

    expect(TestBed.inject(I18nService).locale()).toBe('en');
    expect(toggle?.textContent).toContain('EN');
    expect(root.textContent).toContain('Organize. Invite. Celebrate.');
    expect(root.querySelector('img[width="1536"]')?.getAttribute('alt')).toBe(
      'Friends celebrating at sunset in the bay of Luanda',
    );
  });
});
