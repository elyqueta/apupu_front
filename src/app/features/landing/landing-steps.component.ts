import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ICONS } from '../../core/ui/icons';

interface Step {
  icon: IconDefinition;
  titleKey: TranslationKey;
  textKey: TranslationKey;
}

/** Os quatro passos, com numeração e ícones do conjunto já existente. */
@Component({
  selector: 'app-landing-steps',
  imports: [FaIconComponent],
  template: `
    <section
      id="como-funciona"
      data-testid="landing-steps"
      class="border-b border-line bg-surface/60 py-14 sm:py-20"
    >
      <div class="mx-auto max-w-6xl px-5 sm:px-8">
        <div class="max-w-2xl">
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-strong">
            {{ i18n.t('landing.steps.eyebrow') }}
          </p>
          <h2 class="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {{ i18n.t('landing.steps.title') }}
          </h2>
          <p class="mt-3 text-sm leading-6 text-muted sm:text-base">
            {{ i18n.t('landing.steps.subtitle') }}
          </p>
        </div>
        <ol class="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (step of steps; track step.titleKey; let index = $index) {
            <li class="relative rounded-4xl border border-line bg-surface p-5 shadow-card">
              <div class="flex items-center justify-between gap-3">
                <span
                  class="grid size-11 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-brand-strong"
                >
                  <fa-icon [icon]="step.icon" aria-hidden="true" />
                </span>
                <span class="text-[10px] font-semibold uppercase tracking-widest text-muted">
                  {{ i18n.t('landing.steps.badge', { step: index + 1 }) }}
                </span>
              </div>
              <h3 class="mt-4 font-display text-lg font-semibold text-ink">
                {{ i18n.t(step.titleKey) }}
              </h3>
              <p class="mt-2 text-sm leading-6 text-muted">{{ i18n.t(step.textKey) }}</p>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
})
export class LandingStepsComponent {
  protected readonly i18n = inject(I18nService);

  protected readonly steps: Step[] = [
    {
      icon: ICONS['userPlus'],
      titleKey: 'landing.steps.1.title',
      textKey: 'landing.steps.1.text',
    },
    {
      icon: ICONS['calendarPlus'],
      titleKey: 'landing.steps.2.title',
      textKey: 'landing.steps.2.text',
    },
    {
      icon: ICONS['paperPlane'],
      titleKey: 'landing.steps.3.title',
      textKey: 'landing.steps.3.text',
    },
    {
      icon: ICONS['chartLine'],
      titleKey: 'landing.steps.4.title',
      textKey: 'landing.steps.4.text',
    },
  ];
}
