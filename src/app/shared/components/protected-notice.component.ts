import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';

/**
 * Faixa discreta presente em todas as páginas públicas.
 *
 * O texto vem sempre do i18n para não existir texto hardcoded em templates.
 */
@Component({
  selector: 'app-protected-notice',
  imports: [FaIconComponent],
  template: `
    <div
      role="note"
      data-testid="prototype-notice"
      class="flex min-h-11 items-center justify-center gap-2 border-b border-amber/25 bg-amber/10 px-4 py-2 text-center text-[11px] font-semibold tracking-wide text-amber sm:text-xs"
    >
      <fa-icon [icon]="icons['info']" class="shrink-0 text-xs" aria-hidden="true" />
      <span>{{ i18n.t('prototype.notice') }}</span>
    </div>
  `,
})
export class ProtectedNoticeComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
}
