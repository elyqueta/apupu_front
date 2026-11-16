import { Component, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';

@Component({
  selector: 'app-guest-dialog',
  imports: [ReactiveFormsModule, FaIconComponent],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[100] grid place-items-center overflow-y-auto p-4">
        <button
          type="button"
          class="fixed inset-0 bg-canvas/70 backdrop-blur-md"
          [attr.aria-label]="i18n.t('common.close')"
          (click)="close()"
        ></button>

        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="i18n.t('guests.dialogTitle')"
          class="relative my-8 w-full max-w-lg rounded-4xl border border-line bg-surface-solid/95 p-6 shadow-card backdrop-blur-2xl animate-rise sm:p-7"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <span
                class="grid size-11 shrink-0 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-brand-strong"
              >
                <fa-icon [icon]="icons['userPlus']" aria-hidden="true" />
              </span>
              <div>
                <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
                  {{ i18n.t('guests.dialogTitle') }}
                </h2>
                <p class="mt-1 text-xs leading-5 text-muted">{{ i18n.t('guests.dialogHint') }}</p>
              </div>
            </div>
            <button
              type="button"
              class="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-raised hover:text-ink"
              [attr.aria-label]="i18n.t('common.close')"
              (click)="close()"
            >
              <fa-icon [icon]="icons['close']" class="text-sm" />
            </button>
          </div>

          <form class="mt-6 flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
            <label class="block">
              <span
                class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
              >
                {{ i18n.t('guests.dialogEvent') }}
              </span>
              @if (fixedEventId()) {
                <span
                  class="flex h-11 items-center rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink"
                >
                  {{ eventTitle() }}
                </span>
              } @else {
                <span class="relative block">
                  <select
                    formControlName="eventId"
                    class="h-11 w-full appearance-none rounded-xl border border-line bg-surface-raised px-3 pr-10 text-sm text-ink outline-none transition focus:border-brand/50"
                  >
                    @for (event of store.events(); track event.id) {
                      <option [value]="event.id">{{ event.title }}</option>
                    }
                  </select>
                  <fa-icon
                    [icon]="icons['chevronDown']"
                    class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted"
                  />
                </span>
              }
            </label>

            <label class="block">
              <span
                class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
              >
                {{ i18n.t('guests.dialogName') }} *
              </span>
              <input
                type="text"
                formControlName="name"
                autocomplete="name"
                class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50"
                [placeholder]="i18n.t('create.placeholder.guestName')"
              />
              @if (form.controls.name.touched && form.controls.name.invalid) {
                <span class="mt-1 block text-xs text-coral">{{
                  i18n.t('create.errors.required')
                }}</span>
              }
            </label>

            <label class="block">
              <span
                class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
              >
                {{ i18n.t('guests.dialogEmail') }} *
              </span>
              <input
                type="email"
                formControlName="email"
                autocomplete="email"
                class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50"
                [placeholder]="i18n.t('create.placeholder.guestEmail')"
              />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <span class="mt-1 block text-xs text-coral">{{
                  i18n.t('create.errors.email')
                }}</span>
              }
            </label>

            <label class="block">
              <span
                class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
              >
                {{ i18n.t('guests.dialogPhone') }}
                <span class="font-normal normal-case tracking-normal text-muted/70">
                  ({{ i18n.t('common.optional') }})
                </span>
              </span>
              <input
                type="tel"
                formControlName="phone"
                autocomplete="tel"
                class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50"
                [placeholder]="i18n.t('create.placeholder.guestPhone')"
              />
            </label>

            @if (error()) {
              <p
                class="flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 p-3 text-xs leading-5 text-coral"
                role="alert"
              >
                <fa-icon [icon]="icons['warning']" class="mt-0.5" aria-hidden="true" />
                {{ error() }}
              </p>
            }

            <div class="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink transition hover:border-brand/40"
                (click)="close()"
              >
                {{ i18n.t('common.cancel') }}
              </button>
              <button
                type="submit"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover"
              >
                <fa-icon [icon]="icons['plus']" class="text-xs" aria-hidden="true" />
                {{ i18n.t('guests.dialogSubmit') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class GuestDialogComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  private readonly toasts = inject(ToastService);

  protected readonly icons = ICONS;
  protected readonly error = signal('');

  readonly open = input(false);
  readonly fixedEventId = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly form = this.fb.group({
    eventId: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.form.reset({
        eventId: this.fixedEventId() ?? this.store.events()[0]?.id ?? '',
        name: '',
        email: '',
        phone: '',
      });
      this.error.set('');
    });
  }

  protected eventTitle(): string {
    const id = this.fixedEventId();
    return this.store.eventById(id ?? '')?.title ?? '';
  }

  protected close(): void {
    this.closed.emit();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const result = this.store.addGuest(value.eventId, {
      name: value.name,
      email: value.email,
      phone: value.phone || null,
    });
    if (!result.ok) {
      this.error.set(
        result.reason === 'duplicate'
          ? this.i18n.t('guests.duplicate')
          : this.i18n.t('common.errorGeneric'),
      );
      return;
    }
    const event = this.store.eventById(value.eventId);
    this.toasts.success(
      this.i18n.t('guests.addedText', {
        name: result.guest.name,
        event: event?.title ?? '',
      }),
    );
    this.closed.emit();
  }
}
