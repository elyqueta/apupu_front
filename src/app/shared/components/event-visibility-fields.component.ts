import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { EventVisibility } from '../../core/models/models';
import { ICONS } from '../../core/ui/icons';

/** Controlos partilhados pelo wizard e pelo modal de edição do evento. */
export type EventVisibilityForm = FormGroup<{
  visibility: FormControl<EventVisibility>;
  showAttendeeCount: FormControl<boolean>;
  minAge: FormControl<string>;
  maxAge: FormControl<string>;
}>;

/** Idade opcional: vazio → `null`; senão inteiro 0–120 (`NaN` quando inválido). */
export function parseAge(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (!/^\d{1,3}$/.test(trimmed)) return Number.NaN;
  const age = Number(trimmed);
  return age >= 0 && age <= 120 ? age : Number.NaN;
}

/** Mensagem de validação dos limites de idade ('' quando válidos). */
export function ageRangeError(minRaw: string, maxRaw: string): 'value' | 'range' | '' {
  const min = parseAge(minRaw);
  const max = parseAge(maxRaw);
  if (Number.isNaN(min) || Number.isNaN(max)) return 'value';
  if (min !== null && max !== null && min > max) return 'range';
  return '';
}

/**
 * Seletor "Privado/Público", interruptor "Mostrar o número de confirmados"
 * (só em eventos públicos) e idades mínima/máxima opcionais.
 */
@Component({
  selector: 'app-event-visibility-fields',
  imports: [ReactiveFormsModule, FaIconComponent],
  template: `
    <div [formGroup]="group()" class="flex flex-col gap-4">
      <fieldset>
        <legend class="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {{ i18n.t('block10.visibility.title') }}
        </legend>
        <div class="grid gap-2 sm:grid-cols-2" role="radiogroup">
          @for (option of options; track option.value) {
            <label
              class="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border p-3 transition focus-within:ring-2 focus-within:ring-brand/60"
              [class]="
                value().visibility === option.value
                  ? 'border-brand/50 bg-brand/10'
                  : 'border-line bg-surface-raised hover:border-brand/30'
              "
            >
              <input
                type="radio"
                class="sr-only"
                formControlName="visibility"
                [value]="option.value"
                [attr.data-testid]="'visibility-' + option.value"
              />
              <span
                class="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-brand"
                aria-hidden="true"
              >
                <fa-icon [icon]="icons[option.icon]" />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-ink">{{ i18n.t(option.label) }}</span>
                <span class="mt-0.5 block text-xs leading-5 text-muted">{{ i18n.t(option.hint) }}</span>
              </span>
            </label>
          }
        </div>
      </fieldset>

      @if (value().visibility === 'public') {
        <label
          class="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-line bg-surface-raised p-3"
        >
          <span class="min-w-0">
            <span class="block text-sm font-semibold text-ink">{{ i18n.t('block10.visibility.showCount') }}</span>
            <span class="mt-0.5 block text-xs text-muted">{{ i18n.t('block10.visibility.showCountHint') }}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            class="peer sr-only"
            formControlName="showAttendeeCount"
            data-testid="show-attendee-count"
          />
          <span
            aria-hidden="true"
            class="relative h-6 w-11 shrink-0 rounded-full border transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand/60"
            [class]="value().showAttendeeCount ? 'border-brand/40 bg-brand/70' : 'border-line bg-surface'"
          >
            <span
              class="absolute top-0.5 size-4.5 rounded-full bg-surface-solid shadow transition-all"
              [class]="value().showAttendeeCount ? 'left-[1.45rem]' : 'left-0.5'"
            ></span>
          </span>
        </label>
      }

      <fieldset>
        <legend class="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {{ i18n.t('block10.age.title') }}
        </legend>
        <p class="mb-2 text-xs text-muted">{{ i18n.t('block10.age.hint') }}</p>
        <div class="grid grid-cols-2 gap-3">
          <label class="block min-w-0">
            <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block10.age.min') }}</span>
            <input
              type="text"
              inputmode="numeric"
              maxlength="3"
              formControlName="minAge"
              data-testid="min-age"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50"
              [attr.aria-invalid]="ageError() ? 'true' : null"
              (input)="digitsOnly($event, 'minAge')"
            />
          </label>
          <label class="block min-w-0">
            <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block10.age.max') }}</span>
            <input
              type="text"
              inputmode="numeric"
              maxlength="3"
              formControlName="maxAge"
              data-testid="max-age"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50"
              [attr.aria-invalid]="ageError() ? 'true' : null"
              (input)="digitsOnly($event, 'maxAge')"
            />
          </label>
        </div>
        @if (ageError()) {
          <p class="mt-2 text-xs text-coral" role="alert">{{ ageError() }}</p>
        }
      </fieldset>
    </div>
  `,
})
export class EventVisibilityFieldsComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly icons = ICONS;

  readonly group = input.required<EventVisibilityForm>();

  protected readonly options = [
    {
      value: 'private' as const,
      icon: 'lock',
      label: 'block10.visibility.private' as const,
      hint: 'block10.visibility.privateHint' as const,
    },
    {
      value: 'public' as const,
      icon: 'globe',
      label: 'block10.visibility.public' as const,
      hint: 'block10.visibility.publicHint' as const,
    },
  ];

  protected readonly value = signal({
    visibility: 'private' as EventVisibility,
    showAttendeeCount: false,
    minAge: '',
    maxAge: '',
  });

  ngOnInit(): void {
    this.value.set(this.group().getRawValue());
    this.group()
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.value.set(this.group().getRawValue()));
  }

  protected readonly ageError = computed(() => {
    const { minAge, maxAge } = this.value();
    const error = ageRangeError(minAge, maxAge);
    if (error === 'value') return this.i18n.t('block10.age.valueError');
    if (error === 'range') return this.i18n.t('block10.age.rangeError');
    return '';
  });

  protected digitsOnly(event: Event, control: 'minAge' | 'maxAge'): void {
    const target = event.target as HTMLInputElement;
    const digits = target.value.replace(/\D/g, '').slice(0, 3);
    if (digits !== target.value) {
      target.value = digits;
      this.group().controls[control].setValue(digits);
    }
  }
}
