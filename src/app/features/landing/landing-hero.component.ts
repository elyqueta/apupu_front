import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { LogoComponent } from '../../shared/components/logo.component';

/** Hero da landing: proposta de valor, CTAs e mockup de convite em telemóvel. */
@Component({
  selector: 'app-landing-hero',
  imports: [RouterLink, FaIconComponent, LogoComponent],
  template: `
    <section
      id="inicio"
      data-testid="landing-hero"
      class="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand-soft/60 via-surface to-canvas"
    >
      <div
        aria-hidden="true"
        class="pointer-events-none absolute -left-24 -top-32 size-80 rounded-full bg-brand/10 blur-3xl"
      ></div>
      <div class="relative mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-24">
        <div class="max-w-xl">
          <p
            class="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-surface/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-strong backdrop-blur"
          >
            <fa-icon [icon]="icons['sparkles']" class="text-[10px]" aria-hidden="true" />
            {{ i18n.t('landing.hero.eyebrow') }}
          </p>
          <h1
            class="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
          >
            {{ i18n.t('landing.hero.title') }}
          </h1>
          <p class="mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg">
            {{ i18n.t('landing.hero.subtitle') }}
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              routerLink="/criar-conta"
              data-testid="landing-cta-signup"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-sm font-semibold text-on-secondary shadow-card transition hover:bg-secondary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {{ i18n.t('landing.hero.primary') }}
              <fa-icon [icon]="icons['arrowRight']" class="text-xs" aria-hidden="true" />
            </a>
            <a
              routerLink="/entrar"
              data-testid="landing-cta-login"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-6 text-sm font-semibold text-ink transition hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {{ i18n.t('landing.hero.secondary') }}
            </a>
          </div>
          <p class="mt-4 text-xs text-muted">{{ i18n.t('landing.hero.trust') }}</p>
        </div>

        <div
          role="img"
          [attr.aria-label]="i18n.t('landing.hero.mockup.aria')"
          class="relative mx-auto w-full max-w-sm"
        >
          <div
            aria-hidden="true"
            class="absolute -inset-6 rounded-[3rem] bg-brand/10 blur-2xl"
          ></div>
          <div
            class="relative rounded-[2.5rem] border-[10px] border-ink/90 bg-surface-solid p-4 shadow-2xl"
          >
            <div class="mx-auto mb-3 h-1 w-12 rounded-full bg-line" aria-hidden="true"></div>
            <div
              class="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-brand-soft via-surface to-surface-raised p-5"
            >
              <div class="flex items-start justify-between gap-3">
                <app-logo variant="symbol" [height]="34" />
                <span
                  class="rounded-full border border-brand/25 bg-surface/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-brand-strong"
                >
                  {{ i18n.t('landing.hero.mockup.kicker') }}
                </span>
              </div>
              <p class="mt-6 font-display text-2xl font-semibold leading-snug text-ink">
                {{ i18n.t('landing.hero.mockup.title') }}
              </p>
              <div class="mt-4 space-y-2 text-xs text-muted">
                <p class="flex items-center gap-2">
                  <fa-icon [icon]="icons['calendar']" class="text-brand" aria-hidden="true" />
                  {{ i18n.t('landing.hero.mockup.date') }}
                </p>
                <p class="flex items-center gap-2">
                  <fa-icon [icon]="icons['location']" class="text-brand" aria-hidden="true" />
                  {{ i18n.t('landing.hero.mockup.location') }}
                </p>
              </div>
              <div
                class="mt-6 rounded-2xl border border-brand/25 bg-surface/85 p-4 text-center shadow-card"
              >
                <p class="text-sm font-semibold text-ink">
                  {{ i18n.t('landing.hero.mockup.rsvp') }}
                </p>
                <p class="mt-1 text-[11px] text-muted">
                  {{ i18n.t('landing.hero.mockup.rsvpHint') }}
                </p>
                <div
                  class="mt-3 inline-flex min-h-10 items-center rounded-xl bg-brand px-4 text-xs font-semibold text-on-secondary"
                >
                  {{ i18n.t('landing.hero.mockup.rsvp') }}
                </div>
              </div>
              <p class="mt-5 text-center text-[10px] uppercase tracking-widest text-muted">
                {{ i18n.t('landing.hero.mockup.footer') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class LandingHeroComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
}
