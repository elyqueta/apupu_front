import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ICONS } from '../../core/ui/icons';
import { LogoComponent } from './logo.component';

/**
 * Layout de ecrã inteiro das telas de autenticação (protótipo `conta-comigo-auth.html`).
 *
 * - Desktop (>=860px): painel do formulário encostado a uma extremidade (32%, mínimo
 *   440px) e imagem a ocupar o resto. `reverse` espelha (criar conta = formulário à direita).
 * - Mobile (<860px): a imagem passa a banner (240px) e o formulário sobe numa folha
 *   arredondada por cima do banner.
 *
 * O formulário é projectado via `<ng-content>`; o resto (marca, ferramentas, rodapé,
 * imagem e legenda) é responsabilidade deste componente.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, FaIconComponent, LogoComponent],
  template: `
    <div [class]="shellClass()">
      <section [class]="panelClass()">
        <header
          class="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 min-[860px]:static min-[860px]:px-0 min-[860px]:py-0"
        >
          <a
            routerLink="/entrar"
            class="flex items-center"
            [attr.aria-label]="i18n.t('app.name')"
          >
            <span class="min-[860px]:hidden">
              <app-logo variant="stacked" theme="white" [height]="64" />
            </span>
            <span class="hidden min-[860px]:block">
              <app-logo variant="stacked" [height]="64" class="dark:hidden" />
              <app-logo variant="stacked" theme="white" [height]="64" class="hidden dark:block" />
            </span>
          </a>

          <div class="flex items-center gap-2">
            <!-- TODO: seletor de idioma — sem função por agora, como no protótipo. -->
            <button
              type="button"
              class="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-raised px-2.5 text-[13px] font-semibold text-ink transition hover:border-brand/40"
              [attr.aria-label]="i18n.t('common.language')"
              title="TODO: seletor de idioma"
            >
              <fa-icon [icon]="icons['globe']" class="text-sm" aria-hidden="true" />
              <span>PT</span>
            </button>

            <button
              type="button"
              class="inline-flex size-10 items-center justify-center rounded-xl border border-line bg-surface-raised text-ink transition hover:border-brand/40"
              [attr.aria-label]="i18n.t('common.theme')"
              [attr.aria-pressed]="theme.isDark()"
              (click)="theme.toggle()"
            >
              <fa-icon
                [icon]="theme.isDark() ? icons['sun'] : icons['moon']"
                class="text-sm"
                aria-hidden="true"
              />
            </button>
          </div>
        </header>

        <div
          class="relative z-[1] -mt-9 flex-1 rounded-t-[32px] bg-surface px-6 pb-8 pt-7 min-[860px]:z-auto min-[860px]:my-auto min-[860px]:w-full min-[860px]:flex-none min-[860px]:rounded-none min-[860px]:bg-transparent min-[860px]:px-0 min-[860px]:py-7"
        >
          <ng-content />
        </div>

        <footer class="mt-auto hidden pt-4 text-center text-xs text-muted min-[860px]:block">
          {{ i18n.t('footer.rights', { year: 2026 }) }}
        </footer>
      </section>

      <aside [class]="heroClass()" aria-hidden="false">
        <img
          [src]="heroImage()"
          [alt]="heroAlt()"
          width="1536"
          height="1024"
          fetchpriority="high"
          class="absolute inset-0 size-full object-cover object-center"
        />
        <div
          class="absolute inset-0 bg-gradient-to-b from-cc-primary-900/60 via-cc-primary-900/5 to-cc-primary-900/55"
          aria-hidden="true"
        ></div>

        <div class="absolute inset-x-0 top-0 hidden p-8 min-[860px]:block" aria-hidden="true">
          <span
            class="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-md"
          >
            <fa-icon [icon]="icons['checkDouble']" class="text-[11px]" />
            Eventos sem complicações
          </span>
        </div>

        <div class="absolute inset-x-0 bottom-0 z-[1] hidden px-8 pb-12 pt-8 min-[860px]:block">
          <div
            class="max-w-md rounded-[26px] border border-white/20 bg-cc-primary-900/45 p-6 text-white shadow-2xl backdrop-blur-md"
          >
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
              {{ i18n.t('app.name') }}
            </p>
            <p class="mt-2 font-display text-[26px] font-semibold leading-snug">
              Organiza. Convida. Celebra.
            </p>
            <p class="mt-2 text-sm leading-relaxed text-white/80">
              Convites individuais, confirmações em tempo real e lembretes por email, para que a
              festa comece antes do primeiro brinde.
            </p>
            <div class="mt-4 flex flex-wrap gap-2 text-[12px] font-medium text-white/85">
              <span class="rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                Convites individuais
              </span>
              <span class="rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                RSVP em tempo real
              </span>
              <span class="rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                Lembretes por email
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `,
})
export class AuthLayoutComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly icons = ICONS;

  /** Espelha o layout no desktop: formulário à direita e imagem à esquerda (criar conta). */
  readonly reverse = input(false);
  readonly heroImage = input('/auth-login.webp');
  readonly heroAlt = input('Amigos de costas a celebrar ao pôr do sol na baía de Luanda');

  protected readonly shellClass = computed(() =>
    this.reverse()
      ? 'relative flex min-h-dvh w-full flex-col bg-canvas text-ink min-[860px]:grid min-[860px]:h-dvh min-[860px]:grid-cols-[1fr_minmax(440px,32%)] min-[860px]:overflow-hidden min-[860px]:bg-surface'
      : 'relative flex min-h-dvh w-full flex-col bg-canvas text-ink min-[860px]:grid min-[860px]:h-dvh min-[860px]:grid-cols-[minmax(440px,32%)_1fr] min-[860px]:overflow-hidden min-[860px]:bg-surface',
  );

  protected readonly panelClass = computed(() =>
    this.reverse()
      ? 'contents min-[860px]:order-2 min-[860px]:flex min-[860px]:h-dvh min-[860px]:flex-col min-[860px]:overflow-y-auto min-[860px]:px-11 min-[860px]:py-7'
      : 'contents min-[860px]:flex min-[860px]:h-dvh min-[860px]:flex-col min-[860px]:overflow-y-auto min-[860px]:px-11 min-[860px]:py-7',
  );

  protected readonly heroClass = computed(() =>
    this.reverse()
      ? 'relative order-first h-60 min-h-0 shrink-0 overflow-hidden bg-cc-primary min-[860px]:order-1 min-[860px]:h-dvh min-[860px]:self-start'
      : 'relative order-first h-60 min-h-0 shrink-0 overflow-hidden bg-cc-primary min-[860px]:order-none min-[860px]:h-dvh min-[860px]:self-start',
  );
}
