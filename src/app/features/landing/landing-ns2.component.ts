import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { LogoComponent } from '../../shared/components/logo.component';

/** Bloco de identidade do produto: NS2 Innovation e apoio. */
@Component({
  selector: 'app-landing-ns2',
  imports: [FaIconComponent, LogoComponent],
  template: `
    <section
      id="ns2"
      data-testid="landing-ns2"
      class="border-b border-line bg-canvas py-14 sm:py-20"
    >
      <div class="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-strong">
          {{ i18n.t('landing.ns2.eyebrow') }}
        </p>
        <div class="mt-4 flex justify-center">
          <app-logo variant="symbol" [height]="64" />
        </div>
        <h2 class="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {{ i18n.t('landing.ns2.title') }}
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
          {{ i18n.t('landing.ns2.text') }}
        </p>
        <a
          [href]="i18n.t('landing.ns2.supportUrl')"
          class="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:border-brand/40"
        >
          <fa-icon [icon]="icons['envelope']" class="text-brand" aria-hidden="true" />
          {{ i18n.t('landing.ns2.support') }}
        </a>
      </div>
    </section>
  `,
})
export class LandingNs2Component {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
}
