import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';

/**
 * Primeira tela do convite com capa.
 *
 * A imagem é mostrada sem qualquer texto por cima: a mensagem de boas-vindas
 * e a única ação ficam por baixo dela. Pensada primeiro para telemóvel.
 */
@Component({
  selector: 'app-invitation-welcome',
  imports: [FaIconComponent],
  template: `
    <main class="flex flex-1 flex-col justify-center py-6 sm:py-10">
      <article
        class="mx-auto w-full max-w-xl overflow-hidden rounded-4xl border border-line bg-surface shadow-card"
      >
        <img
          data-testid="invitation-welcome-cover"
          [src]="coverUrl()"
          [alt]="eventTitle()"
          class="block h-64 w-full object-cover sm:h-80"
        />

        <div class="flex flex-col items-center gap-5 px-5 py-7 text-center sm:px-8 sm:py-9">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-strong">
            {{ i18n.t('invitation.eyebrow') }}
          </p>
          <h1 class="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {{ i18n.t('invitation.welcomeTitle') }}
          </h1>
          <p class="max-w-sm text-sm leading-6 text-muted">
            {{ i18n.t('invitation.welcomeMessage', { name: guestName() }) }}
          </p>
          <button
            type="button"
            data-testid="invitation-welcome-continue"
            class="ui-btn mt-1 w-full sm:w-auto sm:min-w-56"
            (click)="continue.emit()"
          >
            <fa-icon [icon]="icons['arrowRight']" aria-hidden="true" />
            {{ i18n.t('invitation.welcomeAction') }}
          </button>
        </div>
      </article>
    </main>
  `,
})
export class InvitationWelcomeComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly coverUrl = input.required<string>();
  readonly guestName = input('');
  readonly eventTitle = input('');

  readonly continue = output<void>();
}
