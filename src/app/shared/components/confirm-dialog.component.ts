import { Component, HostListener, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ICONS } from '../../core/ui/icons';

@Component({
  selector: 'app-confirm-dialog',
  imports: [FaIconComponent],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[100] grid place-items-center p-4">
        <button
          type="button"
          class="absolute inset-0 bg-canvas/70 backdrop-blur-md"
          [attr.aria-label]="cancelLabel()"
          (click)="cancelled.emit()"
        ></button>

        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          class="relative w-full max-w-md rounded-4xl border border-line bg-surface-solid/95 p-6 shadow-card backdrop-blur-2xl animate-rise sm:p-7"
        >
          <span
            class="mb-5 grid size-12 place-items-center rounded-2xl border"
            [class]="
              tone() === 'danger'
                ? 'border-coral/30 bg-coral/10 text-coral'
                : 'border-brand/30 bg-brand/15 text-brand-strong'
            "
          >
            <fa-icon [icon]="tone() === 'danger' ? icons['warning'] : icons['info']" />
          </span>

          <h2 class="font-display text-xl font-semibold tracking-tight text-ink">{{ title() }}</h2>
          <p class="mt-2 text-sm leading-6 text-muted">{{ message() }}</p>

          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink transition hover:border-brand/40"
              (click)="cancelled.emit()"
            >
              {{ cancelLabel() }}
            </button>
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition"
              [class]="
                tone() === 'danger'
                  ? 'bg-coral text-on-danger hover:bg-danger-hover'
                  : 'bg-brand text-on-secondary hover:bg-secondary-hover'
              "
              (click)="confirmed.emit()"
            >
              <fa-icon
                [icon]="tone() === 'danger' ? icons['error'] : icons['check']"
                class="text-sm"
                aria-hidden="true"
              />
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input.required<string>();
  readonly tone = input<'danger' | 'primary'>('danger');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly icons = ICONS;

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.cancelled.emit();
    }
  }
}
