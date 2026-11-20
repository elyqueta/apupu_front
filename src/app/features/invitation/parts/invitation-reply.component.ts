import { Component, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';

/** Cartão com a resposta do anfitrião à mensagem deixada pelo convidado. */
@Component({
  selector: 'app-invitation-reply',
  imports: [FaIconComponent],
  template: `
    @if (answer(); as text) {
      <section
        data-testid="invitation-host-reply"
        class="rounded-3xl border border-mint/30 bg-mint/5 p-4 sm:p-5"
        aria-label="{{ i18n.t('invitation.hostReplyTitle') }}"
      >
        <div class="flex items-start gap-3">
          <span
            class="grid size-10 shrink-0 place-items-center rounded-2xl border border-mint/30 bg-mint/15 text-mint"
          >
            <fa-icon [icon]="icons['envelopeOpen']" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-mint">
              {{ i18n.t('invitation.hostReplyTitle') }}
            </p>
            <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{{ text }}</p>
            @if (answeredAt(); as date) {
              <p class="mt-2 text-[11px] text-muted">
                {{ i18n.t('invitation.hostReplyDate') }} {{ formatDate(date) }}
              </p>
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class InvitationReplyComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly answer = input<string | null>(null);
  readonly answeredAt = input<string | null>(null);

  protected formatDate(value: string): string {
    return this.i18n.formatDate(value, 'Africa/Luanda', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
