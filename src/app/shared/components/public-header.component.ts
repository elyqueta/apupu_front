import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { LogoComponent } from './logo.component';

/** Cabeçalho comum das páginas públicas (feed, comunidade e perfil). */
@Component({
  selector: 'app-public-header',
  imports: [NgTemplateOutlet, RouterLink, FaIconComponent, LogoComponent],
  template: `
    <header class="sticky top-0 z-30 border-b border-line/40 bg-canvas pt-[env(safe-area-inset-top)]">
      <!-- Uma só linha no mobile: voltar (ou menu), marca centrada e sino. -->
      @if (feedMode()) {
        <div class="relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:hidden">
          <button
            type="button"
            class="ui-icon-button"
            [attr.aria-label]="i18n.t('block15.feed.menuButton')"
            [attr.data-testid]="menuTestId()"
            (click)="menu.emit()"
          >
            <fa-icon [icon]="icons['menu']" aria-hidden="true" />
          </button>

          <ng-container *ngTemplateOutlet="mobileLogo" />

          <ng-container *ngTemplateOutlet="notifications" />
        </div>
      } @else {
        <div class="relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:hidden">
          @if (backLink()) {
            <a
              [routerLink]="backLink()"
              class="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink shadow-card transition hover:border-brand/40 hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              [attr.aria-label]="backLabel() || i18n.t('common.back')"
              data-testid="public-header-back-mobile"
            >
              <fa-icon [icon]="icons['chevronLeft']" class="text-xs text-brand-strong" aria-hidden="true" />
              {{ backLabel() || i18n.t('common.back') }}
            </a>
          } @else {
            <span class="w-11" aria-hidden="true"></span>
          }

          <ng-container *ngTemplateOutlet="mobileLogo" />

          <ng-container *ngTemplateOutlet="notifications" />
        </div>
      }

      <div class="hidden sm:block">
        <ng-container *ngTemplateOutlet="desktopNav" />
      </div>
    </header>

    <ng-template #mobileLogo>
      <a
        routerLink="/"
        class="absolute left-1/2 flex min-h-11 -translate-x-1/2 items-center rounded-xl px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        [attr.aria-label]="i18n.t('app.name')"
        data-testid="public-header-logo-mobile"
      >
        <app-logo variant="horizontal" [height]="24" class="dark:hidden" />
        <app-logo variant="horizontal" theme="white" [height]="24" class="hidden dark:block" />
      </a>
    </ng-template>

    <ng-template #notifications>
      <a
        [routerLink]="signedIn() ? '/notificacoes' : '/entrar'"
        class="ui-icon-button relative"
        [attr.aria-label]="i18n.t(signedIn() ? 'block15.feed.notifications' : 'block12.feed.login')"
        data-testid="public-header-notifications-mobile"
      >
        <fa-icon [icon]="icons['bell']" aria-hidden="true" />
        @if (unreadCount() > 0) {
          <span class="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-xs font-bold leading-5 text-white">{{ unreadCount() > 9 ? '9+' : unreadCount() }}</span>
        }
      </a>
    </ng-template>

    <ng-template #desktopNav>
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
            class="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink shadow-card transition hover:border-brand/40 hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            [attr.aria-label]="backLabel() || i18n.t('common.back')"
            data-testid="public-header-back"
          >
            <fa-icon [icon]="icons['chevronLeft']" class="text-xs text-brand-strong" aria-hidden="true" />
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
    </ng-template>
  `,
})
export class PublicHeaderComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly signedIn = input(false);
  readonly backLink = input<string | null>(null);
  readonly backLabel = input('');
  readonly unreadCount = input(0);
  /** No feed, troca o botão de voltar por um menu (âncora do feed). */
  readonly feedMode = input(false);
  readonly menuTestId = input('public-header-menu');
  readonly menu = output<void>();
}
