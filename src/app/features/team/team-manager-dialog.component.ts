import { Component, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { EventsRepository } from '../../core/data/events.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import {
  HostEvent,
  ManagerCreationResult,
  TeamCategory,
} from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { PhoneMaskDirective } from '../../shared/directives/phone-mask.directive';
import { ModalComponent } from '../../shared/components/modal.component';
import { teamErrorMessage } from '../../core/i18n/team-errors';
import { toApiError } from '../../core/api/api-error';
import { ManagerCredentialsDialogComponent } from './manager-credentials-dialog.component';

type ValidityMode = 'week' | 'event' | 'custom';

interface CategoryOption {
  id: TeamCategory;
  labelKey: TranslationKey;
}

/**
 * Modal único para criar equipa + gestor (Bloco 2, Passos 5 e 8).
 * Nunca cria uma equipa sem gestor: a submissão usa sempre a rota que
 * cria ambos na mesma transação.
 */
@Component({
  selector: 'app-team-manager-dialog',
  imports: [
    ReactiveFormsModule,
    FaIconComponent,
    ModalComponent,
    PhoneMaskDirective,
    ManagerCredentialsDialogComponent,
  ],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('managerDialog.createTitle')"
      [dismissible]="!saving()"
      size="lg"
      (closed)="cancel.emit()"
    >
      <form id="app-team-manager-form" data-testid="team-manager-form" [formGroup]="form" (ngSubmit)="submit()">
        <fieldset class="min-w-0">
          <legend class="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-brand">
            {{ i18n.t('managerDialog.teamSection') }}
          </legend>

          <label class="block">
            <span class="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {{ i18n.t('teams.form.event') }}
            </span>
            <select
              formControlName="eventId"
              data-testid="team-manager-event"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/60 disabled:opacity-60"
            >
              <option value="">{{ i18n.t('teams.allEvents') }}</option>
              @for (event of events(); track event.id) {
                <option [value]="event.id">{{ event.title }}</option>
              }
            </select>
          </label>

          <label class="mt-3 block">
            <span class="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {{ i18n.t('managerDialog.name') }}
            </span>
            <input
              formControlName="name"
              type="text"
              maxlength="80"
              autocomplete="off"
              data-testid="team-manager-name"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/60"
            />
            @if (form.controls.name.touched && form.controls.name.invalid) {
              <span class="mt-1 block text-xs text-coral">{{ i18n.t('teams.form.nameRequired') }}</span>
            }
          </label>

          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {{ i18n.t('teams.form.category') }}
              </span>
              <select
                formControlName="category"
                data-testid="team-manager-category"
                class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/60"
              >
                @for (option of categoryOptions; track option.id) {
                  <option [value]="option.id">{{ i18n.t(option.labelKey) }}</option>
                }
              </select>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {{ i18n.t('teams.form.description') }}
              </span>
              <input
                formControlName="description"
                type="text"
                maxlength="500"
                class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/60"
              />
            </label>
          </div>
        </fieldset>

        <fieldset class="mt-6 min-w-0 border-t border-line/70 pt-5">
          <legend class="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-brand">
            {{ i18n.t('managerDialog.managerSection') }}
          </legend>

          <label class="block">
            <span class="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {{ i18n.t('managerDialog.displayName') }}
            </span>
            <input
              formControlName="displayName"
              type="text"
              maxlength="120"
              autocomplete="name"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/60"
            />
          </label>

          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {{ i18n.t('managerDialog.email') }}
              </span>
              <input
                formControlName="email"
                type="email"
                maxlength="320"
                autocomplete="email"
                data-testid="team-manager-email"
                class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/60"
              />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <span class="mt-1 block text-xs text-coral">{{ i18n.t('create.errors.email') }}</span>
              }
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {{ i18n.t('managerDialog.phone') }}
              </span>
              <input
                formControlName="phone"
                type="tel"
                appPhoneMask
                inputmode="tel"
                autocomplete="tel"
                data-testid="team-manager-phone"
                class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/60"
              />
            </label>
          </div>

          @if (form.controls.email.touched && form.controls.phone.touched && !hasContact()) {
            <p class="mt-2 text-xs text-coral" role="alert">{{ i18n.t('managerDialog.contactRequired') }}</p>
          }
          @if (phoneInvalid()) {
            <p class="mt-2 text-xs text-coral" role="alert">{{ i18n.t('managerDialog.phoneInvalid') }}</p>
          }
          <p class="mt-2 text-xs leading-5 text-muted">{{ i18n.t('managerDialog.phoneNotice') }}</p>

          <label class="mt-4 block">
            <span class="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {{ i18n.t('managerDialog.validity') }}
            </span>
            <select
              formControlName="validity"
              data-testid="team-manager-validity"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              <option value="week">{{ i18n.t('managerDialog.validity.week') }}</option>
              <option value="event">{{ i18n.t('managerDialog.validity.event') }}</option>
              <option value="custom">{{ i18n.t('managerDialog.validity.custom') }}</option>
            </select>
          </label>

          @if (form.controls.validity.value === 'custom') {
            <label class="mt-3 block">
              <span class="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {{ i18n.t('managerDialog.validity.customDate') }}
              </span>
              <input
                formControlName="customDate"
                type="date"
                data-testid="team-manager-custom-date"
                [min]="today()"
                [max]="maxDate()"
                class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/60"
              />
            </label>
          }
          <p class="mt-2 text-xs text-muted">
            {{ i18n.t('managerDialog.validity.max', { date: formattedMaxDate() }) }}
          </p>
        </fieldset>

      </form>

      <div modal-footer class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" class="ui-btn-secondary" (click)="cancel.emit()">
          {{ i18n.t('common.cancel') }}
        </button>
        <button
          type="submit"
          form="app-team-manager-form"
          data-testid="team-manager-submit"
          class="ui-btn"
          [disabled]="saving() || form.invalid"
        >
          <fa-icon [icon]="icons['check']" aria-hidden="true" />
          {{ saving() ? i18n.t('managerDialog.creating') : i18n.t('managerDialog.create') }}
        </button>
      </div>
    </app-modal>

    <app-manager-credentials-dialog
      [open]="credentialsOpen()"
      [link]="createdResult()?.link ?? ''"
      [code]="createdResult()?.accessCode ?? ''"
      [eventTitle]="selectedEventTitle()"
      [email]="createdResult()?.manager.email ?? form.controls.email.value"
      [phone]="createdResult()?.manager.phone ?? form.controls.phone.value"
      [inviteStatus]="createdResult()?.emailStatus ?? 'not_sent'"
      (done)="closeCredentials()"
    />
  `,
})
export class TeamManagerDialogComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly repository = inject(EventsRepository);
  private readonly toasts = inject(ToastService);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly open = input(false);
  readonly events = input<HostEvent[]>([]);
  readonly eventId = input<string | null>(null);

  readonly created = output<ManagerCreationResult>();
  readonly cancel = output<void>();

  protected readonly saving = signal(false);
  protected readonly credentialsOpen = signal(false);
  protected readonly createdResult = signal<ManagerCreationResult | null>(null);

  protected readonly categoryOptions: CategoryOption[] = [
    { id: 'logistica', labelKey: 'teamCategory.logistica' },
    { id: 'decoracao', labelKey: 'teamCategory.decoracao' },
    { id: 'musica', labelKey: 'teamCategory.musica' },
    { id: 'catering', labelKey: 'teamCategory.catering' },
    { id: 'rececao', labelKey: 'teamCategory.rececao' },
    { id: 'outra', labelKey: 'teamCategory.outra' },
  ];

  protected readonly form = this.fb.group({
    eventId: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(80)]],
    category: ['outra' as TeamCategory],
    description: [''],
    displayName: [''],
    email: ['', Validators.email],
    phone: [''],
    validity: ['week' as ValidityMode],
    customDate: [''],
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const locked = this.eventId();
      this.form.reset({
        eventId: locked ?? '',
        name: '',
        category: 'outra',
        description: '',
        displayName: '',
        email: '',
        phone: '',
        validity: 'week',
        customDate: '',
      });
      if (locked) this.form.controls.eventId.disable({ emitEvent: false });
      else this.form.controls.eventId.enable({ emitEvent: false });
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.saving.set(false);
      this.credentialsOpen.set(false);
      this.createdResult.set(null);
    });
  }

  protected readonly selectedEvent = () =>
    this.events().find((event) => event.id === (this.eventId() ?? this.form.controls.eventId.value));

  protected readonly selectedEventTitle = () => this.selectedEvent()?.title ?? '';

  protected readonly maxDate = () => {
    const startsAt = this.selectedEvent()?.startsAt;
    if (!startsAt) return '';
    const date = new Date(startsAt.slice(0, 10) + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
  };

  protected readonly formattedMaxDate = () =>
    this.maxDate() ? this.i18n.calendarDate(this.maxDate()) : '—';

  protected readonly today = () => new Date().toISOString().slice(0, 10);

  protected readonly hasContact = () =>
    Boolean(this.form.controls.email.value.trim() || this.form.controls.phone.value.trim());

  protected readonly phoneInvalid = () => {
    const digits = this.form.controls.phone.value.replace(/\D/g, '');
    if (!digits) return false;
    const local = digits.startsWith('244') ? digits.slice(3) : digits;
    return !/^9\d{8}$/.test(local);
  };

  protected async submit(): Promise<void> {
    if (this.form.invalid || !this.hasContact()) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.phoneInvalid()) {
      this.form.controls.phone.markAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    let linkExpiresAt: string | null = null;
    if (value.validity === 'custom') {
      if (!value.customDate) {
        this.form.controls.customDate.markAsTouched();
        return;
      }
      linkExpiresAt = `${value.customDate}T12:00:00.000Z`;
    } else if (value.validity === 'event') {
      if (!this.maxDate()) return;
      linkExpiresAt = `${this.maxDate()}T12:00:00.000Z`;
    }

    this.saving.set(true);
    try {
      const result = await this.repository.createManagerWithTeam(value.eventId, {
        teamName: value.name.trim(),
        teamCategory: value.category,
        teamDescription: value.description.trim() || null,
        displayName: value.displayName.trim() || null,
        email: value.email.trim() || null,
        phone: value.phone.trim() || null,
        linkExpiresAt,
      });
      this.createdResult.set(result);
      this.credentialsOpen.set(true);
      this.created.emit(result);
    } catch (error: unknown) {
      this.toasts.error(teamErrorMessage(this.i18n, toApiError(error)));
    } finally {
      this.saving.set(false);
    }
  }

  protected closeCredentials(): void {
    this.credentialsOpen.set(false);
    this.cancel.emit();
  }
}
