import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, computed, effect, inject, input, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { DEFAULT_MANIFEST, TemplateManifest } from '../../core/models/template-manifest';
import { contrastRatio, ensureContrast, mixHex, readableInk } from '../../core/utils/contrast';

export interface InvitationThemeVars {
  '--inv-bg': string;
  '--inv-surface': string;
  '--inv-surface-raised': string;
  '--inv-ink': string;
  '--inv-muted': string;
  '--inv-accent': string;
  '--inv-accent-ink': string;
  '--inv-line': string;
}

/** Variáveis do template, com contraste ≥ 4.5:1 e sem estilo da plataforma. */
export function invitationThemeVars(manifest: TemplateManifest): InvitationThemeVars {
  const p = manifest.palette;
  const bg = p.bg;
  const ink = ensureContrast(p.ink, bg);
  const accent = p.accent;
  const light = contrastRatio('#FFFFFF', bg) > contrastRatio('#111111', bg);
  return {
    '--inv-bg': bg,
    '--inv-surface': p.surface,
    '--inv-surface-raised': mixHex(p.surface, light ? '#000000' : '#FFFFFF', 0.05),
    '--inv-ink': ink,
    '--inv-muted': ensureContrast(mixHex(p.ink, bg, 0.72), bg),
    '--inv-accent': accent,
    '--inv-accent-ink': readableInk(accent),
    '--inv-line': mixHex(p.ink, bg, 0.15),
  };
}

/**
 * Casca das páginas de convite. O elemento raiz recebe as variáveis `--inv-*`
 * lidas do manifesto; os utilitários `inv-*` são globais mas escopados a esta
 * casca, para chegarem também aos modais e à folha de informações.
 */
@Component({
  selector: 'app-invitation-shell',
  imports: [FaIconComponent],
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'invitation-shell-host',
    '[style]': 'vars()',
  },
  styles: [
    `
      app-invitation-shell {
        display: block;
        min-height: 100dvh;
        background: var(--inv-bg);
        color: var(--inv-ink);
        /* O cartaz full-bleed usa 100vw; evitar que a diferença entre a viewport
           e a área cliente (barra de scroll vertical) crie scroll horizontal. */
        overflow-x: clip;
      }
      app-invitation-shell *,
      app-invitation-shell *::before,
      app-invitation-shell *::after {
        box-sizing: border-box;
      }
      app-invitation-shell .inv-surface { background: var(--inv-surface); }
      app-invitation-shell .inv-surface-raised { background: var(--inv-surface-raised); }
      app-invitation-shell .inv-ink { color: var(--inv-ink); }
      app-invitation-shell .inv-muted { color: var(--inv-muted); }
      app-invitation-shell .inv-line { border-color: var(--inv-line); }
      app-invitation-shell .inv-accent-text { color: var(--inv-accent); }
      app-invitation-shell .inv-accent-bg {
        background: var(--inv-accent);
        color: var(--inv-accent-ink);
      }
      app-invitation-shell .inv-accent-soft {
        background: color-mix(in srgb, var(--inv-accent) 12%, var(--inv-bg));
        color: var(--inv-accent);
      }
      app-invitation-shell .inv-accent-border { border-color: var(--inv-accent); }
      app-invitation-shell .inv-shadow { box-shadow: var(--shadow-card); }
      app-invitation-shell .inv-sep { border-color: var(--inv-line); }

      app-invitation-shell .inv-btn,
      app-invitation-shell .inv-btn-secondary,
      app-invitation-shell .inv-chip,
      app-invitation-shell .inv-fab,
      app-invitation-shell .inv-lang,
      app-invitation-shell .inv-icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        min-height: 44px;
        border-radius: 999px;
        border: 1px solid transparent;
        font: inherit;
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1.2;
        text-decoration: none;
        cursor: pointer;
        transition: transform 150ms ease, filter 150ms ease;
      }
      app-invitation-shell .inv-btn:disabled,
      app-invitation-shell .inv-btn-secondary:disabled { opacity: 0.55; cursor: not-allowed; }
      app-invitation-shell .inv-btn {
        padding: 0.65rem 1.25rem;
        background: var(--inv-accent);
        color: var(--inv-accent-ink);
      }
      app-invitation-shell .inv-btn-secondary {
        padding: 0.65rem 1.1rem;
        border-color: var(--inv-ink);
        background: transparent;
        color: var(--inv-ink);
      }
      app-invitation-shell .inv-chip {
        min-height: 32px;
        padding: 0.3rem 0.75rem;
        border-color: var(--inv-line);
        background: var(--inv-surface);
        color: var(--inv-ink);
        font-size: 0.75rem;
        white-space: nowrap;
      }
      app-invitation-shell .inv-icon-btn {
        width: 44px;
        padding: 0;
        background: transparent;
        color: var(--inv-ink);
      }
      app-invitation-shell .inv-fab {
        position: fixed;
        z-index: 40;
        right: max(1rem, env(safe-area-inset-right));
        bottom: calc(env(safe-area-inset-bottom) + var(--inv-rsvp-bar, 5.5rem) + 0.75rem);
        min-height: 48px;
        min-width: 48px;
        padding: 0.7rem 1.1rem;
        background: var(--inv-accent);
        color: var(--inv-accent-ink);
        box-shadow: var(--shadow-pop);
      }
      @media (min-width: 1024px) {
        app-invitation-shell .inv-fab {
          bottom: calc(env(safe-area-inset-bottom) + 1rem);
        }
      }
      app-invitation-shell .inv-lang {
        position: fixed;
        z-index: 30;
        top: calc(env(safe-area-inset-top) + 0.5rem);
        right: max(0.5rem, env(safe-area-inset-right));
        width: 44px;
        padding: 0;
        background: transparent;
        color: var(--inv-accent);
        opacity: 0.8;
      }
      app-invitation-shell .inv-fab:hover,
      app-invitation-shell .inv-btn:hover { filter: brightness(1.05); }
      app-invitation-shell .inv-btn:focus-visible,
      app-invitation-shell .inv-btn-secondary:focus-visible,
      app-invitation-shell .inv-fab:focus-visible,
      app-invitation-shell .inv-lang:focus-visible,
      app-invitation-shell .inv-icon-btn:focus-visible,
      app-invitation-shell .inv-chip:focus-visible {
        outline: 2px solid var(--inv-accent);
        outline-offset: 2px;
      }
      /* Os modais não usam portal: herdam as variáveis da casca. */
      app-invitation-shell .inv-modal-backdrop { background: var(--inv-bg); opacity: 0.8; }
      app-invitation-shell .inv-modal-panel {
        background: var(--inv-surface);
        color: var(--inv-ink);
        border-color: var(--inv-line);
      }
      app-invitation-shell .inv-modal-handle { background: var(--inv-line); }
      app-invitation-shell .inv-no-scrollbar { scrollbar-width: none; }
      app-invitation-shell .inv-no-scrollbar::-webkit-scrollbar { display: none; }

      /* Gaveta de informações: sobrepõe o convite no telemóvel e comprime-o
         no desktop, onde o cartaz continua a preencher a altura da viewport. */
      app-invitation-shell { --inv-drawer-w: min(26rem, 92vw); }
      app-invitation-shell .inv-drawer-backdrop {
        position: fixed;
        inset: 0;
        z-index: 90;
        border: 0;
        background: color-mix(in srgb, var(--inv-ink) 45%, transparent);
        cursor: pointer;
      }
      app-invitation-shell .inv-drawer {
        position: fixed;
        z-index: 100;
        inset-block: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        width: var(--inv-drawer-w);
        height: 100vh;
        height: 100dvh;
        overflow: hidden;
        border-left: 1px solid var(--inv-line);
        background: var(--inv-surface);
        color: var(--inv-ink);
        box-shadow: var(--shadow-pop);
        transform: translateX(102%);
        transition: transform 200ms ease;
      }
      app-invitation-shell .inv-drawer.inv-drawer-open { transform: translateX(0); }
      app-invitation-shell .inv-drawer-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-shrink: 0;
        padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) 1rem max(1rem, env(safe-area-inset-left));
        border-bottom: 1px solid var(--inv-line);
      }
      app-invitation-shell .inv-drawer-body {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        min-height: 0;
        overflow-y: auto;
        padding: 1rem max(1rem, env(safe-area-inset-right)) max(1.25rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
      }
      app-invitation-shell .inv-drawer-links {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      app-invitation-shell .inv-drawer-link {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        width: 100%;
        min-height: 48px;
        padding: 0.7rem 0.9rem;
        border: 1px solid var(--inv-line);
        border-radius: 1rem;
        background: var(--inv-surface-raised);
        color: var(--inv-ink);
        font: inherit;
        font-size: 0.875rem;
        font-weight: 600;
        text-align: left;
        cursor: pointer;
      }
      app-invitation-shell .inv-drawer-link:hover { filter: brightness(1.03); }
      app-invitation-shell .inv-drawer-link > fa-icon:first-child { color: var(--inv-accent); }
      app-invitation-shell .inv-drawer-chevron { margin-left: auto; color: var(--inv-muted); }
      app-invitation-shell .inv-drawer-link:focus-visible {
        outline: 2px solid var(--inv-accent);
        outline-offset: 2px;
      }

      /* A página de entrada cabe sempre na viewport: sem rolagem no telemóvel
         nem no desktop. O vídeo continua disponível na folha de informações. */
      app-invitation-shell .inv-stage {
        height: 100vh;
        height: 100dvh;
        min-height: 0;
        max-width: none;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      app-invitation-shell .inv-stage-main {
        height: 100vh;
        height: 100dvh;
        min-height: 0;
        padding: 0;
        overflow: hidden;
      }
      app-invitation-shell .inv-stage-poster {
        display: block;
        width: 100%;
        height: 100vh;
        height: 100dvh;
        min-width: 0;
        overflow: hidden;
      }
      app-invitation-shell .inv-stage-poster > div,
      app-invitation-shell .inv-stage-poster app-gratitude-invitation,
      app-invitation-shell .inv-stage-poster app-gratitude-invitation > section {
        display: block;
        width: 100%;
        height: 100%;
      }
      app-invitation-shell .inv-stage-poster .poster.full-bleed {
        width: 100%;
        height: 100%;
        margin-left: 0;
        aspect-ratio: auto;
        border-radius: 0;
      }
      app-invitation-shell .inv-stage-footer { display: none; }

      /* No desktop o cartaz mantém a proporção 4:5 e a gaveta comprime-o
         sem criar overflow horizontal. */
      @media (min-width: 1024px) {
        app-invitation-shell .inv-stage-main {
          display: flex;
          align-items: stretch;
          justify-content: center;
        }
        app-invitation-shell .inv-stage-poster {
          width: min(80vh, 100%);
          width: min(80dvh, 100%);
        }
        app-invitation-shell .inv-stage:has(.inv-drawer-open) .inv-stage-main {
          padding-right: var(--inv-drawer-w);
        }
        app-invitation-shell .inv-stage:has(.inv-drawer-open) .inv-stage-poster {
          width: min(calc(80dvh - var(--inv-drawer-w) / 3), 100%);
        }
      }
    `,
  ],
  template: `
    <div class="min-h-dvh">
      <ng-content />
    </div>
    <button
      type="button"
      class="inv-lang"
      data-testid="inv-lang"
      [attr.aria-label]="i18n.t(locale() === 'pt-AO' ? 'block16.lang.switch' : 'block16.lang.switch.en')"
      (click)="toggleLocale()"
    >
      <fa-icon [icon]="icons['language']" aria-hidden="true" />
      <span class="sr-only">{{ i18n.t('block16.lang') }}</span>
    </button>
  `,
})
export class InvitationShellComponent {
  readonly manifest = input<TemplateManifest>(DEFAULT_MANIFEST);

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly locale = this.i18n.locale;

  protected readonly vars = computed(() => invitationThemeVars(this.manifest()));

  private previousBodyBackground: string | null = null;
  private themeMeta: HTMLMetaElement | null = null;
  private previousThemeColor: string | null = null;

  constructor() {
    effect(() => {
      const bg = this.vars()['--inv-bg'];
      if (!isPlatformBrowser(this.platformId)) return;
      if (this.previousBodyBackground === null) {
        this.previousBodyBackground = this.document.body.style.backgroundColor;
      }
      this.document.body.style.backgroundColor = bg;
      const meta = this.document.head?.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta) {
        if (this.themeMeta === null) this.previousThemeColor = meta.content;
        this.themeMeta = meta;
        meta.content = bg;
      }
    });
  }

  protected toggleLocale(): void {
    this.i18n.setLocale(this.i18n.locale() === 'pt-AO' ? 'en' : 'pt-AO');
  }
}
