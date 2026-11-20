import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ICONS } from '../../core/ui/icons';

interface Benefit {
  icon: IconDefinition;
  titleKey: TranslationKey;
  textKey: TranslationKey;
}

/** Quatro benefícios do produto, apresentados em cards. */
@Component({
  selector: 'app-landing-benefits',
  imports: [FaIconComponent],
  template: `
    <section
      id="beneficios"
      data-testid="landing-benefits"
      class="border-b border-line bg-canvas py-14 sm:py-20"
    >
      <div class="mx-auto max-w-6xl px-5 sm:px-8">
        <div class="max-w-2xl">
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-strong">
            {{ i18n.t('landing.benefits.eyebrow') }}
          </p>
          <h2 class="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {{ i18n.t('landing.benefits.title') }}
          </h2>
          <p class="mt-3 text-sm leading-6 text-muted sm:text-base">
            {{ i18n.t('landing.benefits.subtitle') }}
          </p>
        </div>
        <div class="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (benefit of benefits; track benefit.titleKey) {
            <article
              class="rounded-4xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand/35"
            >
              <span
                class="grid size-11 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-brand-strong"
              >
                <fa-icon [icon]="benefit.icon" aria-hidden="true" />
              </span>
              <h3 class="mt-4 font-display text-lg font-semibold text-ink">
                {{ i18n.t(benefit.titleKey) }}
              </h3>
              <p class="mt-2 text-sm leading-6 text-muted">{{ i18n.t(benefit.textKey) }}</p>
            </article>
          }
        </div>
      </div>
    </section>
  `,
})
export class LandingBenefitsComponent {
  protected readonly i18n = inject(I18nService);

  protected readonly benefits: Benefit[] = [
    {
      icon: ICONS['pen'],
      titleKey: 'landing.benefits.1.title',
      textKey: 'landing.benefits.1.text',
    },
    {
      icon: ICONS['guests'],
      titleKey: 'landing.benefits.2.title',
      textKey: 'landing.benefits.2.text',
    },
    {
      icon: ICONS['checkDouble'],
      titleKey: 'landing.benefits.3.title',
      textKey: 'landing.benefits.3.text',
    },
    {
      icon: ICONS['share'],
      titleKey: 'landing.benefits.4.title',
      textKey: 'landing.benefits.4.text',
    },
  ];
}
