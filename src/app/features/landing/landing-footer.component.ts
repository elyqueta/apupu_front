import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NewsletterRepository } from '../../core/data/newsletter.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { LogoComponent } from '../../shared/components/logo.component';
import { SupportDialogComponent } from './support-dialog.component';

/** CTA final e rodapé, com apoio por formulário e subscrição de novidades. */
@Component({
  selector: 'app-landing-footer',
  imports: [ReactiveFormsModule, RouterLink, FaIconComponent, LogoComponent, SupportDialogComponent],
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
          class="mt-7 inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-6 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover"
        >
          {{ i18n.t('landing.cta.button') }}
        </a>
      </div>
    </section>

    <footer data-testid="landing-footer" class="bg-canvas py-10">
      <div class="mx-auto max-w-6xl px-5 sm:px-8">
        <section
          data-testid="newsletter-form"
          class="mb-8 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div class="max-w-md">
              <h2 class="font-display text-lg font-semibold text-ink">
                {{ i18n.t('newsletter.title') }}
              </h2>
              <p class="mt-1 text-sm leading-6 text-muted">{{ i18n.t('newsletter.text') }}</p>
            </div>
            <form class="flex w-full flex-col gap-2 sm:max-w-sm" [formGroup]="form" (ngSubmit)="subscribe()" novalidate>
              <label class="sr-only" for="newsletter-email">{{ i18n.t('newsletter.placeholder') }}</label>
              <div class="flex flex-col gap-2 sm:flex-row">
                <input
                  id="newsletter-email"
                  formControlName="email"
                  type="email"
                  inputmode="email"
                  autocomplete="email"
                  maxlength="254"
                  data-testid="newsletter-email"
                  class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand aria-[invalid=true]:border-danger"
                  [placeholder]="i18n.t('newsletter.placeholder')"
                  [attr.aria-invalid]="invalid"
                />
                <button
                  type="submit"
                  data-testid="newsletter-submit"
                  [disabled]="saving() || form.invalid"
                  class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  @if (saving()) {
                    <fa-icon [icon]="icons['spinner']" class="animate-spin" aria-hidden="true" />
                  }
                  {{ saving() ? i18n.t('newsletter.subscribing') : i18n.t('newsletter.subscribe') }}
                </button>
              </div>
              @if (invalid) {
                <span role="alert" class="text-xs text-coral">{{ i18n.t('newsletter.error.invalidEmail') }}</span>
              }
            </form>
          </div>
        </section>

        <div class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
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
            <a routerLink="/sobre" fragment="como-funciona" class="min-h-11 inline-flex items-center transition hover:text-ink">
              {{ i18n.t('landing.nav.how') }}
            </a>
            <a routerLink="/sobre" fragment="sobre" class="min-h-11 inline-flex items-center transition hover:text-ink">
              {{ i18n.t('landing.nav.about') }}
            </a>
            <button
              type="button"
              data-testid="footer-support-open"
              class="min-h-11 inline-flex items-center transition hover:text-ink"
              (click)="supportOpen.set(true)"
            >
              {{ i18n.t('landing.footer.support') }}
            </button>
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
      </div>

      <app-support-dialog [open]="supportOpen()" (closed)="supportOpen.set(false)" />
    </footer>
  `,
})
export class LandingFooterComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly year = new Date().getFullYear();

  private readonly formBuilder = inject(FormBuilder);
  private readonly repository = inject(NewsletterRepository);
  private readonly toasts = inject(ToastService);

  protected readonly saving = signal(false);
  protected readonly supportOpen = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  protected get invalid(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.touched || control.dirty);
  }

  protected async subscribe(): Promise<void> {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.controls.email.markAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      await this.repository.subscribe(this.form.controls.email.value);
      this.toasts.success(this.i18n.t('newsletter.success'));
      this.form.reset({ email: '' });
    } catch (error: unknown) {
      this.toasts.error(error instanceof Error ? error.message : this.i18n.t('newsletter.error.generic'));
    } finally {
      this.saving.set(false);
    }
  }
}
