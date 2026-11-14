import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { ThemeMode } from '../models/models';

const THEME_STORAGE_KEY = 'apupu.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(this.platformId);

  private mediaQuery: MediaQueryList | null = null;

  private readonly modeState = signal<ThemeMode>(this.readStoredMode());
  private readonly resolvedState = signal<'dark' | 'light'>('dark');

  readonly mode = this.modeState.asReadonly();
  readonly resolved = this.resolvedState.asReadonly();
  readonly isDark = computed(() => this.resolvedState() === 'dark');

  constructor() {
    if (!this.browser) {
      return;
    }

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.handleSystemChange);
    this.destroyRef.onDestroy(() => {
      this.mediaQuery?.removeEventListener('change', this.handleSystemChange);
    });
    this.apply(this.modeState());
  }

  setMode(mode: ThemeMode): void {
    this.modeState.set(mode);
    if (this.browser) {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
    this.apply(mode);
  }

  toggle(): void {
    this.setMode(this.resolvedState() === 'dark' ? 'light' : 'dark');
  }

  private readonly handleSystemChange = (): void => {
    if (this.modeState() === 'system') {
      this.apply('system');
    }
  };

  private apply(mode: ThemeMode): void {
    if (!this.browser) {
      return;
    }
    const resolved =
      mode === 'system' ? (this.mediaQuery?.matches ? 'dark' : 'light') : mode;
    this.resolvedState.set(resolved);
    const root = this.document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.classList.toggle('light', resolved === 'light');
  }

  private readStoredMode(): ThemeMode {
    if (!isPlatformBrowser(this.platformId)) {
      return 'dark';
    }
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'system' || stored === 'dark' ? stored : 'dark';
  }
}
