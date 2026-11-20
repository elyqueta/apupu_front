import { Component, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ShareService } from '../../../core/services/share.service';
import { ToastService } from '../../../core/services/toast.service';
import { ICONS } from '../../../core/ui/icons';

/** Ações de partilha do convite público, sem expor o link a terceiros por omissão. */
@Component({
  selector: 'app-invitation-share',
  imports: [FaIconComponent],
  template: `
    <section
      data-testid="invitation-share"
      class="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised/60 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0">
        <p class="text-sm font-semibold text-ink">{{ i18n.t('invitation.shareTitle') }}</p>
        <p class="mt-1 text-xs leading-5 text-muted">{{ i18n.t('invitation.shareText') }}</p>
      </div>
      <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
        <button
          type="button"
          data-testid="invitation-copy-link"
          class="ui-btn-secondary justify-center"
          (click)="copyLink()"
        >
          <fa-icon [icon]="icons['copy']" aria-hidden="true" />
          {{ i18n.t('invitation.copyLink') }}
        </button>
        <button
          type="button"
          data-testid="invitation-whatsapp"
          class="ui-btn-secondary justify-center"
          (click)="shareWhatsapp()"
        >
          <fa-icon [icon]="icons['whatsapp']" aria-hidden="true" />
          {{ i18n.t('invitation.whatsapp') }}
        </button>
      </div>
    </section>
  `,
})
export class InvitationShareComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  private readonly share = inject(ShareService);
  private readonly toasts = inject(ToastService);

  readonly token = input.required<string>();

  protected async copyLink(): Promise<void> {
    const copied = await this.share.copy(this.share.absoluteUrl(`/convite/${this.token()}`));
    this.toasts.show(
      copied ? this.i18n.t('common.copied') : this.i18n.t('common.copyFailed'),
      copied ? 'success' : 'error',
    );
  }

  protected shareWhatsapp(): void {
    const url = this.share.absoluteUrl(`/convite/${this.token()}`);
    const text = this.i18n.t('invitation.shareMessage', { url });
    this.share.openExternal(this.share.whatsappShareUrl(text));
  }
}
