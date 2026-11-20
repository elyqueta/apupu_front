import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ICONS } from '../../core/ui/icons';

interface Audience {
  icon: IconDefinition;
  titleKey: TranslationKey;
  textKey: TranslationKey;
}

/** "Para quem é": anfitriões, gestores/equipas e convidados. */
@Component({
  selector: 'app-landing-audience',
  imports: [FaIconComponent],
  template: `
    <section
      id="para-quem"
      data-testid="landing-audience"
      class="border-b border-line bg-canvas py-14 sm:py-20"
    >
      <div class="mx-auto max-w-6xl px-5 sm:px-8">
        <div class="max-w-2xl">
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-strong">
            {{ i18n.t('landing.audience.eyebrow') }}
          </p>
          <h2 class="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {{ i18n.t('landing.audience.title') }}
          </h2>
          <p class="mt-3 text-sm leading-6 text-muted sm:text-base">
            {{ i18n.t('landing.audience.subtitle') }}
          </p>
        </div>
        <div class="mt-9 grid gap-4 md:grid-cols-3">
          @for (group of groups; track group.titleKey) {
            <article class="rounded-4xl border border-line bg-surface p-6 shadow-card">
              <span
                class="grid size-11 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-brand-strong"
              >
                <fa-icon [icon]="group.icon" aria-hidden="true" />
              </span>
              <h3 class="mt-4 font-display text-xl font-semibold text-ink">
                {{ i18n.t(group.titleKey) }}
              </h3>
              <p class="mt-2 text-sm leading-6 text-muted">{{ i18n.t(group.textKey) }}</p>
            </article>
          }
        </div>
      </div>
    </section>
  `,
})
export class LandingAudienceComponent {
  protected readonly i18n = inject(I18nService);

  protected readonly groups: Audience[] = [
    {
      icon: ICONS['glasses'],
      titleKey: 'landing.audience.hosts.title',
      textKey: 'landing.audience.hosts.text',
    },
    {
      icon: ICONS['guestGroup'],
      titleKey: 'landing.audience.managers.title',
      textKey: 'landing.audience.managers.text',
    },
    {
      icon: ICONS['heart'],
      titleKey: 'landing.audience.guests.title',
      textKey: 'landing.audience.guests.text',
    },
  ];
}
