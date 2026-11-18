import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, PLATFORM_ID, effect, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ICONS } from '../../core/ui/icons';

/**
 * Modal de imagem em ecrã inteiro.
 *
 * Usado para ampliar capas de eventos/convites sem sair da página. Fecha com o
 * botão, com o fundo ou com `Escape`; enquanto está aberto bloqueia o scroll do
 * documento.
 */
@Component({
  selector: 'app-image-lightbox',
  imports: [FaIconComponent],
  template: `
    @if (src(); as image) {
      <div
        class="fixed inset-0 z-[120] flex flex-col bg-canvas/95 backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="alt() || closeLabel()"
      >
        <button
          type="button"
          class="absolute inset-0 cursor-zoom-out"
          [attr.aria-label]="closeLabel()"
          [attr.title]="closeLabel()"
          (click)="closed.emit()"
        ></button>

        <div class="relative flex min-h-0 flex-1 flex-col">
          <div class="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p class="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{{ alt() }}</p>
            <button
              type="button"
              class="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-card transition hover:border-brand/40 hover:text-brand-strong"
              [attr.aria-label]="closeLabel()"
              [attr.title]="closeLabel()"
              (click)="closed.emit()"
            >
              <fa-icon [icon]="icons['close']" class="text-sm" aria-hidden="true" />
            </button>
          </div>

          <div class="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-6">
            <img
              [src]="image"
              [alt]="alt()"
              class="max-h-full max-w-full rounded-2xl object-contain shadow-card"
            />
          </div>
        </div>
      </div>
    }
  `,
})
export class ImageLightboxComponent {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  readonly src = input<string | null>(null);
  readonly alt = input('');
  readonly closeLabel = input('Fechar');

  readonly closed = output<void>();

  protected readonly icons = ICONS;

  constructor() {
    effect((onCleanup) => {
      if (!this.src() || !isPlatformBrowser(this.platformId)) {
        return;
      }
      const body = this.document.body;
      const previousOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
      onCleanup(() => {
        body.style.overflow = previousOverflow;
      });
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.src()) {
      this.closed.emit();
    }
  }
}
