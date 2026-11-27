import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { LogoComponent } from './logo.component';

/** Cabeçalho comum das páginas públicas (feed, comunidade e perfil). */
@Component({
  selector: 'app-public-header',
  imports: [RouterLink, FaIconComponent, LogoComponent],
  template: `
    <header class="sticky top-0 z-30 border-b border-line/40 bg-surface/70 backdrop-blur-xl">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4">
        <a
          routerLink="/"
          class="flex min-h-11 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          [attr.aria-label]="i18n.t('app.name')"
          data-testid="public-header-logo"
        >
          <app-logo variant="horizontal" [height]="28" class="dark:hidden" />
          <app-logo variant="horizontal" theme="white" [height]="28" class="hidden dark:block" />
        </a>

        @if (backLink()) {
          <a
            [routerLink]="backLink()"
            class="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-brand-strong transition hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            [attr.aria-label]="backLabel() || i18n.t('common.back')"
            data-testid="public-header-back"
          >
            <fa-icon [icon]="icons['chevronLeft']" class="text-[10px]" aria-hidden="true" />
            {{ backLabel() || i18n.t('common.back') }}
          </a>
        }

        <nav
          class="ml-auto flex flex-wrap items-center gap-1"
          [attr.aria-label]="i18n.t('public.header.nav')"
        >
          <a
            routerLink="/"
            class="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold text-muted transition hover:bg-surface-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            data-testid="public-header-home"
          >
            {{ i18n.t('public.header.home') }}
          </a>
          <a
            routerLink="/ajuda"
            class="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold text-muted transition hover:bg-surface-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            data-testid="public-header-help"
          >
            {{ i18n.t('nav.help') }}
          </a>
          @if (signedIn()) {
            <a
              routerLink="/painel"
              class="ui-btn-secondary min-h-11"
              data-testid="public-header-dashboard"
            >
              {{ i18n.t('public.header.dashboard') }}
            </a>
          } @else {
            <a
              routerLink="/entrar"
              class="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold text-ink transition hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              data-testid="public-header-login"
            >
              {{ i18n.t('block12.feed.login') }}
            </a>
            <a
              routerLink="/criar-conta"
              class="ui-btn min-h-11"
              data-testid="public-header-signup"
            >
              {{ i18n.t('public.header.signup') }}
            </a>
          }
        </nav>
      </div>
    </header>
  `,
})
export class PublicHeaderComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly signedIn = input(false);
  readonly backLink = input<string | null>(null);
  readonly backLabel = input('');
}
