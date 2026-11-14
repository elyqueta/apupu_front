import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';

@Component({
  selector: 'app-brand',
  imports: [RouterLink, FaIconComponent],
  template: `
    <a routerLink="/painel" class="group flex items-center gap-3" aria-label="Apupu">
      <span
        class="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand via-iris to-aqua text-white shadow-glow transition duration-500 group-hover:scale-105"
      >
        <span class="absolute inset-0 rounded-2xl ring-1 ring-white/30"></span>
        <span class="absolute -inset-1 -z-10 rounded-3xl bg-brand/25 blur-xl"></span>
        <fa-icon [icon]="icons['logo']" class="relative text-lg" aria-hidden="true" />
      </span>
      @if (!compact()) {
        <span class="min-w-0">
          <span class="block font-display text-lg font-semibold leading-tight tracking-tight text-ink">
            {{ i18n.t('app.name') }}
          </span>
          <span class="block text-[10px] font-medium uppercase tracking-[0.28em] text-muted">
            {{ i18n.t('app.tagline') }}
          </span>
        </span>
      }
    </a>
  `,
})
export class BrandComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  readonly compact = input(false);
}
