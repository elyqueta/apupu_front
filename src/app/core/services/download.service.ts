import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { DownloadFile } from '../api/api-client';

/**
 * Guarda no disco um ficheiro devolvido pela API.
 *
 * O nome vem de `Content-Disposition`; quando o browser não o expõe,
 * usa-se o nome de recurso indicado pelo chamador. No servidor (SSR)
 * não há download para iniciar.
 */
@Injectable({ providedIn: 'root' })
export class DownloadService {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  save(file: DownloadFile, fallbackName: string): void {
    if (!this.browser) {
      return;
    }

    const url = URL.createObjectURL(file.blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = file.filename ?? fallbackName;
    link.hidden = true;
    this.document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
