import { Component, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ShareService } from '../../core/services/share.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';

/**
 * Link aberto de um evento público (Bloco 10): mostra o URL com os botões
 * "Copiar" e "Reencaminhar por WhatsApp" lado a lado.
 */
@Component({
  selector: 'app-public-link-card',
  imports: [FaIconComponent],
  template: `
    <section
      class="rounded-4xl border border-line bg-surface p-4 shadow-card backdrop-blur-2xl sm:p-5"
      data-testid="public-link-card"
    >
      <div class="flex items-start gap-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand" aria-hidden="true">
          <fa-icon [icon]="icons['globe']" />
        </span>
        <div class="min-w-0 flex-1">
          <h3 class="text-sm font-semibold text-ink">{{ i18n.t('block10.publicLink.title') }}</h3>
          <p class="mt-0.5 text-xs leading-5 text-muted">{{ i18n.t('block10.publicLink.hint') }}</p>
        </div>
      </div>
      <p
        class="mt-3 truncate rounded-xl border border-line bg-surface-raised px-3 py-2.5 font-mono text-xs text-ink"
        [title]="url()"
        data-testid="public-link-url"
      >
        {{ url() }}
      </p>
      <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" class="ui-btn-secondary" data-testid="public-link-copy" (click)="copy()">
          <fa-icon [icon]="icons['copy']" aria-hidden="true" />
          {{ i18n.t('block10.copy.link') }}
        </button>
        <button type="button" class="ui-btn" data-testid="public-link-whatsapp" (click)="whatsapp()">
          <fa-icon [icon]="icons['whatsapp']" aria-hidden="true" />
          {{ i18n.t('block10.publicLink.whatsapp') }}
        </button>
      </div>
    </section>
  `,
})
export class PublicLinkCardComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly share = inject(ShareService);
  private readonly toasts = inject(ToastService);

  readonly url = input.required<string>();
  readonly eventTitle = input.required<string>();

  protected async copy(): Promise<void> {
    if (await this.share.copy(this.url())) {
      this.toasts.success(this.i18n.t('block10.copy.done'));
    } else {
      this.toasts.error(this.i18n.t('block10.copy.failed'));
    }
  }

  protected whatsapp(): void {
    const text = this.i18n.t('block10.publicLink.whatsappMessage', {
      event: this.eventTitle(),
      url: this.url(),
    });
    this.share.openExternal(this.share.whatsappShareUrl(text));
  }
}
