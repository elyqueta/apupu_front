import { Component, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ICONS } from '../../core/ui/icons';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-confirm-dialog',
  imports: [FaIconComponent, ModalComponent],
  template: `
    <app-modal [open]="open()" size="sm" [title]="title()" (closed)="cancelled.emit()">
      <div class="flex items-start gap-4 pt-1">
        <span
          class="grid size-12 shrink-0 place-items-center rounded-2xl border"
          [class]="
            tone() === 'danger'
              ? 'border-coral/30 bg-coral/10 text-coral'
              : 'border-brand/30 bg-brand/15 text-brand-strong'
          "
        >
          <fa-icon [icon]="tone() === 'danger' ? icons['warning'] : icons['info']" />
        </span>
        <p class="text-sm leading-6 text-muted">{{ message() }}</p>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end" modal-footer>
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
    </app-modal>
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
}
