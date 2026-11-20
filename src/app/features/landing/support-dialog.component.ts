import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { SupportRepository } from '../../core/data/support.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { ModalComponent } from '../../shared/components/modal.component';

/** Formulário público de apoio: nome, email e mensagem guardados no backend. */
@Component({
  selector: 'app-support-dialog',
  imports: [ReactiveFormsModule, FaIconComponent, ModalComponent],
  template: `
    <app-modal
      data-testid="support-dialog"
      [open]="open() && !sentFlag()"
      [title]="i18n.t('support.title')"
      [dismissible]="!saving()"
      (closed)="close()"
    >
      <p class="text-sm leading-6 text-muted">{{ i18n.t('support.subtitle') }}</p>

      @if (error()) {
        <p
          role="alert"
          data-testid="support-error"
          class="mt-4 rounded-xl border border-coral/30 bg-coral/10 p-3 text-sm text-coral"
        >
          {{ error() }}
        </p>
      }

      <form
        id="app-support-form"
        class="mt-4 grid gap-4"
        data-testid="support-form"
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
      >
        <label class="grid gap-1.5">
          <span class="text-xs font-semibold text-ink">{{ i18n.t('support.name') }}</span>
          <input
            formControlName="name"
            data-testid="support-name"
            autocomplete="name"
            maxlength="120"
            class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand aria-[invalid=true]:border-danger"
            [placeholder]="i18n.t('support.namePlaceholder')"
            [attr.aria-invalid]="invalid('name')"
          />
          @if (invalid('name')) {
            <span class="text-xs text-coral">{{ i18n.t('support.error.requiredName') }}</span>
          }
        </label>

        <label class="grid gap-1.5">
          <span class="text-xs font-semibold text-ink">{{ i18n.t('support.email') }}</span>
          <input
            formControlName="email"
            data-testid="support-email"
            type="email"
            autocomplete="email"
            inputmode="email"
            maxlength="254"
            class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand aria-[invalid=true]:border-danger"
            [placeholder]="i18n.t('support.emailPlaceholder')"
            [attr.aria-invalid]="invalid('email')"
          />
          @if (invalid('email')) {
            <span class="text-xs text-coral">
              {{
                form.controls.email.hasError('required')
                  ? i18n.t('support.error.requiredEmail')
                  : i18n.t('support.error.invalidEmail')
              }}
            </span>
          }
        </label>

        <label class="grid gap-1.5">
          <span class="text-xs font-semibold text-ink">{{ i18n.t('support.message') }}</span>
          <textarea
            formControlName="message"
            data-testid="support-message"
            rows="5"
            maxlength="2000"
            class="min-h-28 w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-brand aria-[invalid=true]:border-danger"
            [placeholder]="i18n.t('support.messagePlaceholder')"
            [attr.aria-invalid]="invalid('message')"
          ></textarea>
          @if (invalid('message')) {
            <span class="text-xs text-coral">
              {{
                form.controls.message.hasError('required')
                  ? i18n.t('support.error.requiredMessage')
                  : i18n.t('support.error.messageMin')
              }}
            </span>
          }
        </label>
      </form>

      <div modal-footer class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          data-testid="support-cancel"
          class="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink transition hover:border-brand/40"
          (click)="close()"
        >
          {{ i18n.t('support.cancel') }}
        </button>
        <button
          type="submit"
          form="app-support-form"
          data-testid="support-submit"
          [disabled]="saving() || form.invalid"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          @if (saving()) {
            <fa-icon [icon]="icons['spinner']" class="animate-spin" aria-hidden="true" />
          }
          {{ saving() ? i18n.t('support.sending') : i18n.t('support.submit') }}
        </button>
      </div>
    </app-modal>

    <app-modal
      data-testid="support-success-dialog"
      [open]="open() && sentFlag()"
      [title]="i18n.t('support.title')"
      (closed)="close()"
    >
      <div class="flex flex-col items-center gap-3 py-6 text-center" data-testid="support-success">
        <span
          class="grid size-14 place-items-center rounded-2xl border border-mint/30 bg-mint/10 text-mint"
          aria-hidden="true"
        >
          <fa-icon [icon]="icons['success']" class="text-2xl" />
        </span>
        <p class="text-sm leading-6 text-ink">{{ i18n.t('support.success') }}</p>
      </div>
      <div modal-footer class="flex justify-end">
        <button
          type="button"
          data-testid="support-close"
          class="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover"
          (click)="close()"
        >
          {{ i18n.t('common.close') }}
        </button>
      </div>
    </app-modal>
  `,
})
export class SupportDialogComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly submitted = output<void>();

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly formBuilder = inject(FormBuilder);
  private readonly repository = inject(SupportRepository);
  private readonly toasts = inject(ToastService);

  protected readonly saving = signal(false);
  protected readonly sentFlag = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  protected invalid(field: 'name' | 'email' | 'message'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  protected close(): void {
    if (this.saving()) {
      return;
    }
    this.form.reset({ name: '', email: '', message: '' });
    this.error.set('');
    this.sentFlag.set(false);
    this.closed.emit();
  }

  protected async submit(): Promise<void> {
    if (this.saving() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      await this.repository.send(this.form.getRawValue());
      this.sentFlag.set(true);
      this.toasts.success(this.i18n.t('support.success'));
      this.submitted.emit();
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : this.i18n.t('support.error.generic'));
    } finally {
      this.saving.set(false);
    }
  }
}
