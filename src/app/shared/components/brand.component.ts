import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-brand',
  imports: [RouterLink],
  template: `
    <a routerLink="/painel" class="group flex items-center gap-3" aria-label="Conta Comigo">
      <img
        src="/assets/conta-comigo-icone.svg"
        alt=""
        aria-hidden="true"
        class="size-11 shrink-0 rounded-2xl transition duration-300 group-hover:scale-105"
      />
      @if (!compact()) {
        <span class="min-w-0">
          <span
            class="block font-display text-lg font-semibold leading-tight tracking-tight text-ink"
          >
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
  readonly compact = input(false);
}
