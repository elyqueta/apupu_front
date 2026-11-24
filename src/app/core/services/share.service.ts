import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Normaliza um número de telefone para o formato aceite pelo `wa.me`
 * (apenas dígitos, com indicativo do país e sem `+`).
 *
 * Assume Angola (indicativo `244`) para números locais de 9 dígitos, uma vez
 * que a aplicação é orientada a esse mercado.
 * TODO: tornar o indicativo configurável quando houver suporte a múltiplos países.
 */
export function normalizePhoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.length === 9) {
    digits = `244${digits}`;
  } else if (digits.length === 10 && digits.startsWith('0')) {
    digits = `244${digits.slice(1)}`;
  }
  return digits.length >= 8 ? digits : null;
}

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

  /**
   * Constrói o URL de reencaminhamento pelo WhatsApp (`wa.me`) com a mensagem
   * pré-preenchida. Devolve `null` quando o número não é válido, para que a
   * interface possa desativar a ação.
   */
  whatsappUrl(phone: string | null | undefined, text: string): string | null {
    const digits = normalizePhoneForWhatsApp(phone);
    if (!digits) {
      return null;
    }
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  /**
   * Partilha sem destinatário específico (ex.: convite público). O WhatsApp
   * abre o seletor de contactos com a mensagem já preenchida.
   */
  whatsappShareUrl(text: string): string {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  /** Abre um URL externo num novo separador (no-op no servidor). */
  openExternal(url: string): void {
    if (!this.browser) {
      return;
    }
    this.document.defaultView?.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Copia texto para a área de transferência. Usa a Clipboard API e, quando
   * não está disponível (contexto não seguro, WebView antiga), recorre a
   * `document.execCommand('copy')` com um `textarea` temporário.
   */
  async copy(text: string): Promise<boolean> {
    if (!this.browser) {
      return false;
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // continua para o fallback
      }
    }
    return this.copyWithExecCommand(text);
  }

  private copyWithExecCommand(text: string): boolean {
    const doc = this.document;
    const area = doc.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    doc.body.appendChild(area);
    area.select();
    try {
      return doc.execCommand('copy');
    } catch {
      return false;
    } finally {
      area.remove();
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
