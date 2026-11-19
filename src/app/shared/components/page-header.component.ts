import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';

/**
 * Cabeçalho partilhado das páginas principais.
 *
 * Mantém o aspeto atual (eyebrow + título + subtítulo + ações à direita) e
 * acrescenta apenas um botão "Voltar" opcional. O título é sempre `h1` para
 * uma hierarquia de cabeçalhos correta.
 */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, FaIconComponent],
  template: `
    <header class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div class="min-w-0">
        @if (backLink()) {
          <a
            [routerLink]="backLink()"
            class="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-strong transition hover:text-ink"
          >
            <fa-icon [icon]="icons['arrowLeft']" class="text-[10px]" aria-hidden="true" />
            {{ backLabel() || i18n.t('common.back') }}
          </a>
        }
        @if (eyebrow()) {
          <p
            class="hidden text-[10px] font-semibold uppercase tracking-[0.26em] text-brand-strong md:block"
          >
            {{ eyebrow() }}
          </p>
        }
        <h1
          class="mt-1.5 hidden font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl md:block"
        >
          {{ title() }}
        </h1>
        @if (subtitle()) {
          <p class="text-[13px] leading-5 text-muted md:mt-1.5 md:max-w-2xl md:text-sm md:leading-6">
            {{ subtitle() }}
          </p>
        }
      </div>
      @if (hasActions()) {
        <div class="flex flex-wrap items-center gap-2">
          <ng-content select="[header-actions]" />
        </div>
      }
    </header>
  `,
})
export class PageHeaderComponent {
  private readonly i18n = inject(I18nService);

  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly eyebrow = input<string>('');
  readonly backLink = input<string | null>(null);
  readonly backLabel = input<string>('');
  /** Permite ocultar o contentor de ações quando não há conteúdo projetado. */
  readonly hasActions = input(false);

  protected readonly icons = ICONS;
}
