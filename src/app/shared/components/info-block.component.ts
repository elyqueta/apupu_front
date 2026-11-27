import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';

/** Bloco de informação/estado vazio reutilizado nas páginas públicas. */
@Component({
  selector: 'app-info-block',
  imports: [RouterLink, FaIconComponent],
  template: `
    <section
      class="flex flex-col items-center gap-3 rounded-4xl border border-line/40 bg-surface/60 p-6 text-center shadow-card backdrop-blur-xl sm:flex-row sm:items-start sm:text-left"
      [attr.data-testid]="testId()"
    >
      <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand-strong">
        <fa-icon [icon]="icons[icon()]" class="text-lg" aria-hidden="true" />
      </span>
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-semibold text-ink">{{ title() }}</h2>
        <p class="mt-1 text-sm leading-6 text-muted">{{ message() }}</p>
      </div>
      @if (actionLink() && actionLabel()) {
        <a [routerLink]="actionLink()" class="ui-btn min-h-11 shrink-0">
          {{ actionLabel() }}
        </a>
      }
    </section>
  `,
})
export class InfoBlockComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly icon = input<keyof typeof ICONS>('info');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly actionLabel = input('');
  readonly actionLink = input<string | null>(null);
  readonly testId = input<string>('info-block');
}
