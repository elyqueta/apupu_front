import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { LogoComponent } from '../../shared/components/logo.component';

/** CTA final e rodapé com links placeholder para termos e privacidade. */
@Component({
  selector: 'app-landing-footer',
  imports: [RouterLink, LogoComponent],
  template: `
    <section
      data-testid="landing-cta"
      class="border-b border-line bg-gradient-to-br from-brand-soft via-surface to-brand-soft py-14 sm:py-20"
    >
      <div class="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <h2 class="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {{ i18n.t('landing.cta.title') }}
        </h2>
        <p class="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
          {{ i18n.t('landing.cta.text') }}
        </p>
        <a
          routerLink="/criar-conta"
          data-testid="landing-final-cta"
          class="mt-7 inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-6 text-sm font-semibold text-on-secondary shadow-card transition hover:bg-secondary-hover"
        >
          {{ i18n.t('landing.cta.button') }}
        </a>
      </div>
    </section>

    <footer data-testid="landing-footer" class="bg-canvas py-10">
      <div class="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div class="max-w-sm">
          <a routerLink="/" class="inline-flex items-center" [attr.aria-label]="i18n.t('app.name')">
            <app-logo variant="horizontal" [height]="32" class="dark:hidden" />
            <app-logo variant="horizontal" theme="white" [height]="32" class="hidden dark:block" />
          </a>
          <p class="mt-4 text-sm leading-6 text-muted">{{ i18n.t('landing.footer.tagline') }}</p>
        </div>
        <nav
          class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted"
          [attr.aria-label]="i18n.t('app.name')"
        >
          <a routerLink="/" fragment="como-funciona" class="min-h-11 inline-flex items-center transition hover:text-ink">
            {{ i18n.t('landing.nav.how') }}
          </a>
          <a routerLink="/" fragment="sobre" class="min-h-11 inline-flex items-center transition hover:text-ink">
            {{ i18n.t('landing.nav.about') }}
          </a>
          <a [href]="i18n.t('landing.ns2.supportUrl')" class="min-h-11 inline-flex items-center transition hover:text-ink">
            {{ i18n.t('landing.footer.support') }}
          </a>
          <span [attr.title]="i18n.t('common.soon')" aria-disabled="true" class="cursor-default">
            {{ i18n.t('footer.terms') }}
          </span>
          <span [attr.title]="i18n.t('common.soon')" aria-disabled="true" class="cursor-default">
            {{ i18n.t('footer.privacy') }}
          </span>
        </nav>
        <div class="text-sm text-muted md:text-right">
          <p class="font-semibold text-ink">{{ i18n.t('landing.footer.product') }}</p>
          <p class="mt-2">{{ i18n.t('footer.rights', { year: year }) }}</p>
        </div>
      </div>
    </footer>
  `,
})
export class LandingFooterComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly year = new Date().getFullYear();
}
