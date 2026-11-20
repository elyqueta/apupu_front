import { Component, inject, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';

/** Entrada discreta para o modal com mensagem, regras, vestuário e contribuição. */
@Component({
  selector: 'app-invitation-details-menu',
  imports: [FaIconComponent],
  template: `
    <button
      type="button"
      data-testid="invitation-more-details"
      class="flex h-14 w-full items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 text-left transition hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      (click)="open.emit()"
    >
      <span class="flex items-center gap-3 text-sm font-semibold text-ink">
        <span class="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand-strong">
          <fa-icon [icon]="icons['lines']" aria-hidden="true" />
        </span>
        {{ i18n.t('invitation.moreDetails') }}
      </span>
      <fa-icon [icon]="icons['chevronRight']" class="text-muted" aria-hidden="true" />
    </button>
  `,
})
export class InvitationDetailsMenuComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly open = output<void>();
}
