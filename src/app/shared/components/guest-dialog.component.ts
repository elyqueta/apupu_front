import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { toApiError } from '../../core/api/api-error';
import { Guest, GuestKind } from '../../core/models/models';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { PhoneMaskDirective } from '../directives/phone-mask.directive';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-guest-dialog',
  imports: [ReactiveFormsModule, FaIconComponent, PhoneMaskDirective, ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="isEdit() ? i18n.t('guests.editTitle') : i18n.t('guests.dialogTitle')"
      (closed)="close()"
    >
      <div class="flex items-start gap-3">
        <span
          class="grid size-11 shrink-0 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-brand-strong"
        >
          <fa-icon [icon]="isEdit() ? icons['pen'] : icons['userPlus']" aria-hidden="true" />
        </span>
        <p class="mt-2 text-xs leading-5 text-muted">
          {{ isEdit() ? i18n.t('guests.editHint') : i18n.t('guests.dialogHint') }}
        </p>
      </div>

      <form id="app-guest-form" class="mt-6 flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
            <label class="block">
              <span
                class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
              >
                {{ i18n.t('guests.dialogEvent') }}
              </span>
              @if (fixedEventId() || isEdit()) {
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
                {{ i18n.t('block15.guest.kind') }}
              </span>
              <span class="relative block">
                <select
                  formControlName="guestKind"
                  class="h-11 w-full appearance-none rounded-xl border border-line bg-surface-raised px-3 pr-10 text-sm text-ink outline-none transition focus:border-brand/50"
                >
                  @for (kind of guestKinds; track kind.value) {
                    <option [value]="kind.value">{{ i18n.t(kind.labelKey) }}</option>
                  }
                </select>
                <fa-icon
                  [icon]="icons['chevronDown']"
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted"
                />
              </span>
            </label>

            @if (form.controls.guestKind.value === 'couple') {
              <label class="block">
                <span
                  class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  {{ i18n.t('block15.guest.companionName') }}
                </span>
                <input
                  type="text"
                  formControlName="companionName"
                  class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50"
                  [placeholder]="i18n.t('block15.guest.companionPlaceholder')"
                />
              </label>
            }

            @if (form.controls.guestKind.value === 'family' || form.controls.guestKind.value === 'couple') {
              <label class="block">
                <span
                  class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  {{ i18n.t('block15.guest.partySize') }}
                  <span class="font-normal normal-case tracking-normal text-muted/70">
                    ({{ i18n.t('common.optional') }})
                  </span>
                </span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  formControlName="partySize"
                  class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50"
                  [placeholder]="form.controls.guestKind.value === 'couple' ? '2' : ''"
                />
                <span class="mt-1 block text-xs text-muted">{{ i18n.t('block15.guest.partySizeHint') }}</span>
              </label>
            }

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
                class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50 disabled:cursor-not-allowed disabled:opacity-60"
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
                appPhoneMask
                autocomplete="tel"
                class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50 disabled:cursor-not-allowed disabled:opacity-60"
                [placeholder]="i18n.t('create.placeholder.guestPhone')"
              />
              <span class="mt-1 block text-xs text-muted">{{ i18n.t('common.phoneHint') }}</span>
            </label>

            @if (contactLocked()) {
              <p
                class="flex items-start gap-2 rounded-xl border border-amber/30 bg-amber/10 p-3 text-xs leading-5 text-amber"
              >
                <fa-icon [icon]="icons['lock']" class="mt-0.5" aria-hidden="true" />
                {{ i18n.t('guests.contactLocked') }}
              </p>
            }

            @if (error()) {
              <p
                class="flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 p-3 text-xs leading-5 text-coral"
                role="alert"
              >
                <fa-icon [icon]="icons['warning']" class="mt-0.5" aria-hidden="true" />
                {{ error() }}
              </p>
            }

      </form>

      <div modal-footer class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" class="ui-btn-secondary" (click)="close()">
          {{ i18n.t('common.cancel') }}
        </button>
        <button
          type="submit"
          form="app-guest-form"
          class="ui-btn"
          [disabled]="saving()"
        >
          <fa-icon
            [icon]="isEdit() ? icons['check'] : icons['plus']"
            class="text-xs"
            aria-hidden="true"
          />
          {{ isEdit() ? i18n.t('guests.editSubmit') : i18n.t('guests.dialogSubmit') }}
        </button>
      </div>
    </app-modal>
  `,
})
export class GuestDialogComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  private readonly toasts = inject(ToastService);

  protected readonly icons = ICONS;
  protected readonly error = signal('');
  protected readonly saving = signal(false);

  readonly open = input(false);
  readonly fixedEventId = input<string | null>(null);
  /** Quando definido, o diálogo edita este convidado em vez de criar um novo. */
  readonly guest = input<Guest | null>(null);
  readonly closed = output<void>();

  protected readonly isEdit = computed(() => this.guest() !== null);
  protected readonly contactLocked = computed(() => Boolean(this.guest()?.openedAt));

  protected readonly guestKinds: { value: GuestKind | ''; labelKey: TranslationKey }[] = [
    { value: '', labelKey: 'block15.guest.kind.neutral' },
    { value: 'male', labelKey: 'block15.guest.kind.male' },
    { value: 'female', labelKey: 'block15.guest.kind.female' },
    { value: 'couple', labelKey: 'block15.guest.kind.couple' },
    { value: 'family', labelKey: 'block15.guest.kind.family' },
  ];

  protected readonly form = this.fb.group({
    eventId: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    guestKind: ['' as GuestKind | ''],
    companionName: [''],
    partySize: [null as number | null],
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const guest = this.guest();
      this.form.reset({
        eventId: guest?.eventId ?? this.fixedEventId() ?? this.store.events()[0]?.id ?? '',
        name: guest?.name ?? '',
        email: guest?.email ?? '',
        phone: guest?.phone ?? '',
        guestKind: (guest?.guestKind ?? '') as GuestKind | '',
        companionName: guest?.companionName ?? '',
        partySize: guest?.partySize ?? null,
      });

      if (this.contactLocked()) {
        this.form.controls.email.disable({ emitEvent: false });
        this.form.controls.phone.disable({ emitEvent: false });
      } else {
        this.form.controls.email.enable({ emitEvent: false });
        this.form.controls.phone.enable({ emitEvent: false });
      }

      this.error.set('');
    });
  }

  protected eventTitle(): string {
    const id = this.fixedEventId() ?? this.guest()?.eventId ?? '';
    return this.store.eventById(id)?.title ?? '';
  }

  protected close(): void {
    this.closed.emit();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const guestKind = (value.guestKind || null) as GuestKind | null;
    const partyRaw = value.partySize;
    const partySize =
      partyRaw === null || partyRaw === undefined || partyRaw === ('' as unknown)
        ? null
        : Number(partyRaw);
    const input = {
      name: value.name,
      email: value.email,
      phone: value.phone || null,
      guestKind,
      companionName: guestKind === 'couple' ? (value.companionName || null) : null,
      partySize:
        guestKind === 'family' || guestKind === 'couple'
          ? (Number.isFinite(partySize) && partySize! > 0 ? partySize : guestKind === 'couple' ? 2 : null)
          : null,
    };

    try {
      const guest = this.guest();
      if (guest) {
        const updated = await this.store.updateGuest(guest, input);
        this.toasts.success(this.i18n.t('guests.updated', { name: updated.name }));
      } else {
        const result = await this.store.addGuest(value.eventId, input);
        const event = this.store.eventById(value.eventId);
        this.toasts.success(
          this.i18n.t('guests.addedText', {
            name: result.guest.name,
            event: event?.title ?? '',
          }),
        );
      }
      this.closed.emit();
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
