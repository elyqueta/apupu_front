import { Component, computed, input } from '@angular/core';

export type LogoVariant = 'horizontal' | 'stacked' | 'symbol';
export type LogoTheme = 'default' | 'white' | 'mono';

const LOGO_SOURCES: Record<LogoVariant, Record<LogoTheme, string>> = {
  horizontal: {
    default: '/brand/logo-horizontal.svg',
    white: '/brand/logo-horizontal-white.svg',
    mono: '/brand/logo-horizontal-mono.svg',
  },
  stacked: {
    default: '/brand/logo-stacked.svg',
    white: '/brand/logo-stacked-white.svg',
    // O brand-kit não fornece versão mono empilhada; usa-se a versão oficial.
    mono: '/brand/logo-stacked.svg',
  },
  symbol: {
    default: '/brand/symbol.svg',
    white: '/brand/symbol-white.svg',
    mono: '/brand/symbol-mono.svg',
  },
};

/** Proporções nativas dos SVG (largura / altura) para evitar deformação e CLS. */
const LOGO_RATIOS: Record<LogoVariant, number> = {
  horizontal: 964.688 / 256,
  stacked: 751.448 / 388,
  symbol: 188 / 260,
};

/**
 * Logótipo oficial da Conto Contigo.
 *
 * - `variant`: horizontal, empilhado ou símbolo.
 * - `theme`: cores oficiais (`default`), versão branca para fundos escuros (`white`)
 *   ou monocromática (`mono`).
 * - `height`: altura em píxeis; a largura é calculada pela proporção do SVG.
 */
@Component({
  selector: 'app-logo',
  template: `
    <img
      [src]="source()"
      alt="Conto Contigo"
      [style.height.px]="height()"
      [style.width.px]="width()"
      class="block max-w-none shrink-0 select-none"
      draggable="false"
      decoding="async"
    />
  `,
})
export class LogoComponent {
  readonly variant = input<LogoVariant>('horizontal');
  readonly theme = input<LogoTheme>('default');
  readonly height = input(36);

  protected readonly source = computed(() => LOGO_SOURCES[this.variant()][this.theme()]);

  protected readonly width = computed(
    () => Math.round(this.height() * LOGO_RATIOS[this.variant()] * 100) / 100,
  );
}
