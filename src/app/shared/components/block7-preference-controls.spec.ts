import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';
import { PreferenceControlsComponent } from './preference-controls.component';

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

describe('PreferenceControlsComponent · Bloco 7', () => {
  let fixture: ComponentFixture<PreferenceControlsComponent>;

  beforeEach(() => {
    localStorage.setItem('contacomigo.locale', 'pt-AO');
    localStorage.setItem('contacomigo.theme', 'light');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(mediaQuery(false)),
    });
    TestBed.configureTestingModule({
      imports: [PreferenceControlsComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    fixture = TestBed.createComponent(PreferenceControlsComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(I18nService).setLocale('pt-AO');
    TestBed.inject(ThemeService).setMode('light');
    fixture.destroy();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'matchMedia');
    localStorage.clear();
  });

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  }

  it('troca o idioma e actualiza o rótulo e o atributo da página', () => {
    const [language] = buttons();
    expect(language?.textContent).toContain('PT');
    expect(document.documentElement.lang).toBe('pt-AO');

    language?.click();
    fixture.detectChanges();

    expect(TestBed.inject(I18nService).locale()).toBe('en');
    expect(buttons()[0]?.textContent).toContain('EN');
    expect(document.documentElement.lang).toBe('en');
  });

  it('troca o tema e expõe o estado ao botão', () => {
    const theme = TestBed.inject(ThemeService);
    const themeButton = buttons()[1];
    expect(theme.isDark()).toBe(false);
    expect(themeButton?.getAttribute('aria-pressed')).toBe('false');

    themeButton?.click();
    fixture.detectChanges();

    expect(theme.isDark()).toBe(true);
    expect(buttons()[1]?.getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
