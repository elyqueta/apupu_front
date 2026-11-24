import { Injectable, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { ShareService } from '../../core/services/share.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { PersonPrimaryAction } from '../components/person-card.component';

/**
 * Botão "Copiar" que acompanha cada "Reencaminhar por WhatsApp" (Bloco 10):
 * copia o link (Clipboard API com fallback `execCommand`) e mostra um toast.
 */
@Injectable({ providedIn: 'root' })
export class LinkCopyService {
  private readonly share = inject(ShareService);
  private readonly toasts = inject(ToastService);
  private readonly i18n = inject(I18nService);

  async copy(url: string | null | undefined): Promise<boolean> {
    if (!url) {
      this.toasts.error(this.i18n.t('block10.copy.failed'));
      return false;
    }
    const copied = await this.share.copy(url);
    if (copied) {
      this.toasts.success(this.i18n.t('block10.copy.done'));
    } else {
      this.toasts.error(this.i18n.t('block10.copy.failed'));
    }
    return copied;
  }

  /** Ação secundária do cartão de pessoa: só ícone, com `aria-label`. */
  action(): PersonPrimaryAction {
    return {
      id: 'copy',
      label: this.i18n.t('block10.copy.label'),
      icon: ICONS['copy'],
      hint: this.i18n.t('block10.copy.link'),
    };
  }
}
