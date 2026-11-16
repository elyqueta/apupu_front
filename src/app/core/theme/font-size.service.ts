import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type FontSize = 'normal' | 'large' | 'largest';

const FONT_SIZE_STORAGE_KEY = 'contacomigo.font-size';

function isFontSize(value: string | null): value is FontSize {
  return value === 'normal' || value === 'large' || value === 'largest';
}

@Injectable({ providedIn: 'root' })
export class FontSizeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(this.platformId);

  private readonly sizeState = signal<FontSize>(this.readStoredSize());
  readonly size = this.sizeState.asReadonly();

  constructor() {
    this.apply(this.sizeState());
  }

  setSize(size: FontSize): void {
    this.sizeState.set(size);
    if (this.browser) {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
    }
    this.apply(size);
  }

  private apply(size: FontSize): void {
    if (this.browser) {
      this.document.documentElement.dataset['fontSize'] = size;
    }
  }

  private readStoredSize(): FontSize {
    if (!this.browser) {
      return 'normal';
    }
    const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    return isFontSize(stored) ? stored : 'normal';
  }
}
