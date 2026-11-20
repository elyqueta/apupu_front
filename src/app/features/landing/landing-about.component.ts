import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';

/** Missão, estado atual e próximos passos, de forma honesta e curta. */
@Component({
  selector: 'app-landing-about',
  imports: [FaIconComponent],
  template: `
    <section
      id="sobre"
      data-testid="landing-about"
      class="border-b border-line bg-surface/60 py-14 sm:py-20"
    >
      <div class="mx-auto grid max-w-6xl gap-8 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div class="max-w-xl">
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-strong">
            {{ i18n.t('landing.about.eyebrow') }}
          </p>
          <h2 class="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {{ i18n.t('landing.about.title') }}
          </h2>
          <p class="mt-4 text-base leading-7 text-muted">{{ i18n.t('landing.about.mission') }}</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <article class="rounded-4xl border border-line bg-surface p-5 shadow-card">
            <span
              class="grid size-10 place-items-center rounded-2xl border border-amber/25 bg-amber/10 text-amber"
            >
              <fa-icon [icon]="icons['hourglass']" aria-hidden="true" />
            </span>
            <h3 class="mt-4 font-display text-lg font-semibold text-ink">
              {{ i18n.t('landing.about.stateTitle') }}
            </h3>
            <p class="mt-2 text-sm leading-6 text-muted">{{ i18n.t('landing.about.stateText') }}</p>
          </article>
          <article class="rounded-4xl border border-line bg-surface p-5 shadow-card">
            <span
              class="grid size-10 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-brand-strong"
            >
              <fa-icon [icon]="icons['sparkles']" aria-hidden="true" />
            </span>
            <h3 class="mt-4 font-display text-lg font-semibold text-ink">
              {{ i18n.t('landing.about.nextTitle') }}
            </h3>
            <p class="mt-2 text-sm leading-6 text-muted">{{ i18n.t('landing.about.nextText') }}</p>
          </article>
        </div>
      </div>
    </section>
  `,
})
export class LandingAboutComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
}
