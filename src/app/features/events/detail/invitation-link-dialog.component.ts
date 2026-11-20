import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';
import { ModalComponent } from '../../../shared/components/modal.component';

/**
 * Configura a validade do link individual de um convite.
 *
 * O backend limita a data a `fim do evento + 30 dias`; o limite é passado
 * pela página e também validado aqui para feedback imediato.
 */
@Component({
  selector: 'app-invitation-link-dialog',
  imports: [ReactiveFormsModule, FaIconComponent, ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('eventDetail.linkValidity')"
      size="sm"
      (closed)="closed.emit()"
    >
      <form
        id="app-invitation-link-form"
        class="flex flex-col gap-3"
        [formGroup]="form"
        (ngSubmit)="submit()"
      >
        <p class="text-xs leading-5 text-muted">
          {{ i18n.t('eventDetail.linkValidityHint', { name: guestName() }) }}
        </p>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-muted">
            {{ i18n.t('eventDetail.linkValidityDate') }}
          </span>
          <input
            type="date"
            formControlName="date"
            data-testid="invitation-link-date"
            class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50"
            [min]="min()"
            [max]="maxDate().slice(0, 10)"
          />
          @if (form.controls.date.touched && form.controls.date.invalid) {
            <span class="mt-1 block text-xs text-coral">{{ i18n.t('eventDetail.linkValidityInvalid') }}</span>
          }
        </label>
        <p class="text-[11px] leading-5 text-muted">
          {{ i18n.t('eventDetail.linkValidityMax', { date: i18n.shortDate(maxDate(), 'UTC') }) }}
        </p>
      </form>
      @if (error()) {
        <p role="alert" class="mt-3 rounded-xl border border-coral/25 bg-coral/5 p-3 text-xs text-coral">
          {{ error() }}
        </p>
      }
      <div modal-footer class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink transition hover:border-brand/40"
          (click)="closed.emit()"
        >
          {{ i18n.t('common.cancel') }}
        </button>
        <button
          type="submit"
          form="app-invitation-link-form"
          data-testid="invitation-link-save"
          class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover"
          [disabled]="saving()"
        >
          <fa-icon [icon]="icons['check']" aria-hidden="true" />
          {{ saving() ? i18n.t('common.saving') : i18n.t('common.save') }}
        </button>
      </div>
    </app-modal>
  `,
})
export class InvitationLinkDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly formBuilder = inject(FormBuilder);

  readonly open = input(false);
  readonly guestName = input('');
  readonly currentDate = input('');
  readonly maxDate = input('');
  readonly saving = input(false);
  readonly error = input('');

  /** Data `YYYY-MM-DD` escolhida, enviada ao backend como `expires_at`. */
  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly form = this.formBuilder.nonNullable.group({
    date: ['', Validators.required],
  });

  protected readonly min = signal(new Date().toISOString().slice(0, 10));

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const date = this.currentDate() || this.maxDate() || this.min();
      this.form.reset({ date: date.slice(0, 10) });
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const date = this.form.controls.date.value;
    if (this.maxDate() && date > this.maxDate().slice(0, 10)) {
      this.form.controls.date.setErrors({ max: true });
      this.form.controls.date.markAsTouched();
      return;
    }
    this.saved.emit(`${date}T23:59:59.000Z`);
  }
}
