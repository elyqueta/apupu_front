import { Component, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';

/** Estado público de um evento cancelado: substitui o convite completo. */
@Component({
  selector: 'app-invitation-cancelled',
  imports: [FaIconComponent],
  template: `
    <main class="flex flex-1 items-center justify-center py-10">
      <article
        data-testid="invitation-cancelled"
        class="w-full max-w-lg rounded-4xl border inv-line inv-surface p-6 text-center inv-shadow animate-rise sm:p-8"
      >
        <span
          class="mx-auto grid size-16 place-items-center rounded-3xl border border-coral/30 bg-coral/10 text-2xl text-coral"
        >
          <fa-icon [icon]="icons['warning']" aria-hidden="true" />
        </span>
        <p class="mt-5 text-xs font-semibold uppercase tracking-[0.2em] inv-muted">
          {{ i18n.t('invitation.eyebrow') }}
        </p>
        <h1 class="mt-2 font-display text-2xl font-semibold tracking-tight inv-ink">
          {{ i18n.t('invitation.cancelledTitle') }}
        </h1>
        <p class="mt-3 text-sm leading-6 inv-muted">{{ i18n.t('invitation.cancelledText') }}</p>
        <p class="mt-2 text-xs leading-5 inv-muted">{{ i18n.t('invitation.cancelledContact') }}</p>

        <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          @if (hostEmail()) {
            <a class="inv-btn-secondary justify-center" [href]="'mailto:' + hostEmail()">
              <fa-icon [icon]="icons['envelope']" aria-hidden="true" />
              {{ i18n.t('invitation.emailHost') }}
            </a>
          }
          @if (hostPhone()) {
            <a
              class="inv-btn-secondary justify-center"
              [href]="whatsappLink()"
              target="_blank"
              rel="noopener noreferrer"
            >
              <fa-icon [icon]="icons['whatsapp']" aria-hidden="true" />
              {{ i18n.t('invitation.whatsapp') }}
            </a>
          }
        </div>

        @if (hostName()) {
          <p class="mt-5 text-xs font-semibold inv-muted">
            {{ i18n.t('invitation.hostInline', { name: hostName() }) }}
          </p>
        }
      </article>
    </main>
  `,
})
export class InvitationCancelledComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly hostName = input('');
  readonly hostEmail = input('');
  readonly hostPhone = input<string | null>(null);

  protected whatsappLink(): string {
    const digits = (this.hostPhone() ?? '').replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : '#';
  }
}
