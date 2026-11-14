import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(this.platformId);

  absoluteUrl(path: string): string {
    if (!this.browser) {
      return path;
    }
    return new URL(path, this.document.baseURI).toString();
  }

  async copy(text: string): Promise<boolean> {
    if (!this.browser || !navigator.clipboard?.writeText) {
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async share(data: ShareData): Promise<ShareResult> {
    if (!this.browser) {
      return 'failed';
    }
    if (navigator.share) {
      try {
        await navigator.share(data);
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return 'cancelled';
        }
        return 'failed';
      }
    }
    if (data.url) {
      const copied = await this.copy(data.url);
      return copied ? 'copied' : 'failed';
    }
    return 'failed';
  }
}
