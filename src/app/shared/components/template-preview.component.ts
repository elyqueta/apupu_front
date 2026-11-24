import { Component, computed, input } from '@angular/core';
import { DEFAULT_MANIFEST, manifestStyle, TemplateManifest } from '../../core/models/template-manifest';

/**
 * Bloco 14 — pré-visualização desenhada a partir do manifesto (não é uma
 * imagem estática): paleta, fontes, moldura, cantos e divisor em SVG
 * próprio. Mantém sempre a paleta do template (também no modo escuro).
 */
@Component({
  selector: 'app-template-preview',
  host: { class: 'block' },
  template: `
    @for (key of [m()]; track key) {
    <div
      class="relative isolate flex size-full flex-col overflow-hidden rounded-[inherit]"
      [class]="variantClass() + (animate() ? ' tpl-open-' + m().open_style : '')"
      [style]="style()"
      [style.background]="'var(--tpl-bg)'"
      [style.color]="'var(--tpl-ink)'"
      [attr.data-open-style]="m().open_style"
      role="img"
      [attr.aria-label]="label() || title()"
    >
      @if (m().ornaments.frame !== 'none') {
        <span class="pointer-events-none absolute inset-2 rounded-2xl border" [style.border-color]="'var(--tpl-accent)'" aria-hidden="true"></span>
        @if (m().pdf.frame === 'double') {
          <span class="pointer-events-none absolute inset-3 border opacity-60" [style.border-color]="'var(--tpl-accent)'" aria-hidden="true"></span>
        }
      }
      @if (m().ornaments.corners !== 'none') {
        @for (corner of corners; track corner) {
          <svg
            class="pointer-events-none absolute size-8 sm:size-10"
            [class]="corner"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
            [style.color]="'var(--tpl-accent)'"
          >
            @switch (m().ornaments.corners) {
              @case ('blobs') {
                <circle cx="8" cy="8" r="9" fill="currentColor" opacity="0.35" />
                <circle cx="20" cy="6" r="4" fill="currentColor" opacity="0.25" />
              }
              @case ('leaves') {
                <path d="M4 36 C4 18 12 6 30 4" stroke="currentColor" stroke-width="1.2" />
                <path d="M10 22 q6 -2 8 -9 q-7 1 -8 9z" fill="currentColor" opacity="0.6" />
                <path d="M18 12 q6 -1 9 -7 q-7 0 -9 7z" fill="currentColor" opacity="0.5" />
              }
              @case ('rays') {
                <path d="M4 4 L20 4 M4 4 L4 20 M4 4 L16 16" stroke="currentColor" stroke-width="1.2" />
              }
              @default {
                <path d="M4 36 Q4 4 36 4" stroke="currentColor" stroke-width="1.2" />
                <path d="M10 28 Q10 10 28 10" stroke="currentColor" stroke-width="0.8" />
                <circle cx="13" cy="13" r="2" fill="currentColor" />
              }
            }
          </svg>
        }
      }

      <div class="relative flex flex-1 flex-col justify-center gap-2 px-6 py-6" [class.items-center]="center()" [class.text-center]="center()">
        <span class="text-[0.75rem] uppercase tracking-[0.3em]" [style.color]="'var(--tpl-muted)'" [style.font-family]="'var(--tpl-body)'">{{ kicker() }}</span>
        <p
          class="max-w-full break-words leading-tight"
          [class]="titleClass()"
          [style.font-family]="'var(--tpl-display)'"
          [class.uppercase]="m().fonts.display === 'cap'"
        >
          {{ title() }}
        </p>
        @if (m().ornaments.divider !== 'none') {
          <span class="flex items-center gap-1.5" aria-hidden="true">
            <span class="h-px w-8" [style.background]="'var(--tpl-accent)'"></span>
            @if (m().ornaments.divider !== 'line') {
              <span class="size-1.5 rotate-45" [style.background]="'var(--tpl-accent)'"></span>
              <span class="h-px w-8" [style.background]="'var(--tpl-accent)'"></span>
            }
          </span>
        }
        @if (subtitle()) {
          <p class="line-clamp-2 text-xs leading-5 sm:text-sm" [style.color]="'var(--tpl-muted)'" [style.font-family]="'var(--tpl-body)'">{{ subtitle() }}</p>
        }
      </div>
    </div>
    }
  `,
})
export class TemplatePreviewComponent {
  readonly manifest = input<TemplateManifest | null | undefined>(null);
  readonly variant = input<'thumb' | 'cover' | 'hero'>('cover');
  readonly title = input('');
  readonly subtitle = input('');
  readonly kicker = input('');
  readonly label = input('');
  /** Reproduz a animação de abertura do template (respeita movimento reduzido). */
  readonly animate = input(false);

  protected readonly corners = ['left-2 top-2', 'right-2 top-2 -scale-x-100', 'bottom-2 left-2 -scale-y-100', 'bottom-2 right-2 -scale-100'];
  protected readonly m = computed(() => this.manifest() ?? DEFAULT_MANIFEST);
  protected readonly style = computed(() => manifestStyle(this.m()));
  protected readonly center = computed(() => this.m().layout.align === 'center');
  protected readonly variantClass = computed(() => {
    switch (this.variant()) {
      case 'thumb':
        return 'aspect-[4/3]';
      case 'hero':
        return 'h-full min-h-44';
      default:
        return 'aspect-[16/9]';
    }
  });
  protected readonly titleClass = computed(() => {
    const script = this.m().fonts.display === 'script';
    switch (this.variant()) {
      case 'thumb':
        return script ? 'text-2xl' : 'text-lg font-semibold';
      case 'hero':
        return script ? 'text-5xl' : 'text-3xl font-semibold sm:text-4xl';
      default:
        return script ? 'text-4xl' : 'text-2xl font-semibold';
    }
  });
}
