import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ICONS } from '../../core/ui/icons';

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
  imports: [RouterLink, FaIconComponent],
  template: `
    <div [class]="shellClass()">
      <section [class]="panelClass()">
        <header
          class="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 min-[860px]:static min-[860px]:px-0 min-[860px]:py-0"
        >
          <a
            routerLink="/entrar"
            class="flex items-center gap-3"
            [attr.aria-label]="i18n.t('app.name')"
          >
            <img
              src="/assets/conta-comigo-icone.svg"
              alt=""
              aria-hidden="true"
              width="44"
              height="44"
              class="size-11 shrink-0 rounded-2xl"
            />
            <span class="hidden min-[860px]:block">
              <b
                class="block font-display text-lg font-semibold leading-tight tracking-tight text-ink"
              >
                {{ i18n.t('app.name') }}
              </b>
              <small class="block text-[11px] uppercase tracking-[0.18em] text-muted">
                {{ i18n.t('app.tagline') }}
              </small>
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

        <footer
          class="mt-auto hidden pt-4 text-center text-xs text-muted min-[860px]:block"
        >
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
          class="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,25,24,0.5),transparent_45%)]"
          aria-hidden="true"
        ></div>

        <div
          class="absolute left-[12%] top-[46%] hidden size-[72px] place-items-center rounded-[18px] bg-[#FAFCFB]/95 shadow-[0_10px_30px_rgba(0,0,0,0.18)] min-[860px]:grid"
          aria-hidden="true"
        >
          <img
            src="/assets/conta-comigo-icone.svg"
            alt=""
            width="44"
            height="44"
            class="size-11"
          />
        </div>

        <div
          class="absolute left-12 top-12 hidden max-w-[380px] text-white [text-shadow:0_1px_12px_rgba(5,25,24,0.35)] min-[860px]:block"
        >
          <h2 class="font-display text-3xl font-semibold leading-tight">Convida. Confirma. Celebra.</h2>
          <p class="mb-3.5 mt-2.5 opacity-90">
            Eventos e convites para qualquer ocasião, de casamentos a noites de jogos.
          </p>
          <a routerLink="/criar-conta" class="font-semibold text-white underline">
            Criar a minha conta
          </a>
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
      ? 'relative flex min-h-dvh w-full flex-col bg-canvas text-ink min-[860px]:grid min-[860px]:grid-cols-[1fr_minmax(440px,32%)] min-[860px]:bg-surface'
      : 'relative flex min-h-dvh w-full flex-col bg-canvas text-ink min-[860px]:grid min-[860px]:grid-cols-[minmax(440px,32%)_1fr] min-[860px]:bg-surface',
  );

  protected readonly panelClass = computed(() =>
    this.reverse()
      ? 'contents min-[860px]:order-2 min-[860px]:flex min-[860px]:min-h-dvh min-[860px]:flex-col min-[860px]:px-11 min-[860px]:py-7'
      : 'contents min-[860px]:flex min-[860px]:min-h-dvh min-[860px]:flex-col min-[860px]:px-11 min-[860px]:py-7',
  );

  protected readonly heroClass = computed(() =>
    this.reverse()
      ? 'relative order-first h-60 min-h-0 shrink-0 overflow-hidden bg-[#0F3D3E] min-[860px]:order-1 min-[860px]:h-auto min-[860px]:min-h-dvh'
      : 'relative order-first h-60 min-h-0 shrink-0 overflow-hidden bg-[#0F3D3E] min-[860px]:order-none min-[860px]:h-auto min-[860px]:min-h-dvh',
  );
}
