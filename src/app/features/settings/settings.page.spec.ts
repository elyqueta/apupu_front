import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/api/auth.service';
import { SupportRepository } from '../../core/data/support.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeMode } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { FontSize, FontSizeService } from '../../core/theme/font-size.service';
import { ThemeService } from '../../core/theme/theme.service';
import { SettingsPage } from './settings.page';

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }
}

describe('SettingsPage', () => {
  const theme = { mode: signal<ThemeMode>('dark'), setMode: vi.fn() };
  const fontSize = { size: signal<FontSize>('normal'), setSize: vi.fn() };
  const i18n = {
    t: (key: string) => key,
    locale: signal('pt-AO'),
    setLocale: vi.fn(),
  };
  const store = {
    load: vi.fn(),
    profile: signal({ name: 'Ana Costa', email: 'ana@example.com', avatarUrl: null }),
    managementEvent: signal(null),
  };
  const auth = { changePassword: vi.fn().mockResolvedValue(undefined), logout: vi.fn().mockResolvedValue(undefined) };
  const toasts = { success: vi.fn(), error: vi.fn() };

  let fixture: ComponentFixture<SettingsPage>;
  let destroyed: boolean;

  function query<T extends Element>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector) as T | null;
  }

  function queryAll<T extends Element>(selector: string): T[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector)) as T[];
  }

  beforeEach(async () => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    Element.prototype.scrollIntoView = vi.fn();

    TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        provideRouter([]),
        { provide: ThemeService, useValue: theme },
        { provide: FontSizeService, useValue: fontSize },
        { provide: I18nService, useValue: i18n },
        { provide: WorkspaceStore, useValue: store },
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toasts },
        { provide: SupportRepository, useValue: { send: vi.fn() } },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    theme.mode.set('dark');
    fontSize.size.set('normal');
    i18n.locale.set('pt-AO');
    vi.clearAllMocks();

    destroyed = false;
    fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (!destroyed) {
      fixture.destroy();
    }
    vi.unstubAllGlobals();
  });

  it('renders five sections in the same order in the nav and as cards', () => {
    const expected = ['conta', 'aparencia', 'idioma', 'seguranca', 'ajuda'];
    expect(
      queryAll<HTMLAnchorElement>('nav a[data-testid^="settings-nav-"]').map((link) =>
        link.getAttribute('data-testid'),
      ),
    ).toEqual(expected.map((id) => `settings-nav-${id}`));
    expect(queryAll<HTMLElement>('article').map((card) => card.id)).toEqual(expected);
  });

  it('keeps the active nav item in sync with clicks and the scroll observer', () => {
    const links = queryAll<HTMLAnchorElement>('nav a[data-testid^="settings-nav-"]');
    links[4].click();
    fixture.detectChanges();
    expect(links[4].getAttribute('aria-current')).toBe('true');
    expect(links[0].getAttribute('aria-current')).toBeNull();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    const observer = FakeIntersectionObserver.instances[0];
    expect(observer.observe).toHaveBeenCalledTimes(5);
    observer.callback(
      [
        {
          target: document.getElementById('idioma'),
          isIntersecting: true,
        } as unknown as IntersectionObserverEntry,
      ],
      observer as unknown as IntersectionObserver,
    );
    fixture.detectChanges();
    expect(links[2].getAttribute('aria-current')).toBe('true');

    fixture.destroy();
    destroyed = true;
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('uses native radios with checked semantics for theme, font size and locale', () => {
    const themeRadios = queryAll<HTMLInputElement>('input[name="settings-theme"]');
    expect(themeRadios).toHaveLength(3);
    expect(themeRadios[0].getAttribute('role')).toBe('radio');
    expect(themeRadios[0].getAttribute('aria-checked')).toBe('true');
    themeRadios[1].click();
    expect(theme.setMode).toHaveBeenCalledWith('light');

    const fontRadios = queryAll<HTMLInputElement>('input[name="settings-font-size"]');
    expect(fontRadios).toHaveLength(3);
    expect(fontRadios[0].getAttribute('aria-checked')).toBe('true');
    fontRadios[2].click();
    expect(fontSize.setSize).toHaveBeenCalledWith('largest');

    const localeRadios = queryAll<HTMLInputElement>('input[name="settings-locale"]');
    expect(localeRadios).toHaveLength(2);
    expect(localeRadios[0].getAttribute('aria-checked')).toBe('true');
    localeRadios[1].click();
    expect(i18n.setLocale).toHaveBeenCalledWith('en');
  });

  it('asks for confirmation before logging out', async () => {
    query<HTMLButtonElement>('[data-testid="settings-logout-open"]')?.click();
    fixture.detectChanges();
    expect(auth.logout).not.toHaveBeenCalled();

    const confirmButton = document.querySelector<HTMLButtonElement>(
      'app-confirm-dialog [data-testid="app-modal-footer"] button:last-child',
    );
    expect(confirmButton).not.toBeNull();
    confirmButton?.click();
    await fixture.whenStable();

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/entrar']);
  });
});
