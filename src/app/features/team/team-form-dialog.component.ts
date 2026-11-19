import { Component, effect, HostListener, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { HostEvent, Team, TeamCategory } from '../../core/models/models';
import { ICONS } from '../../core/ui/icons';

export interface TeamFormValue {
  eventId: string;
  name: string;
  category: TeamCategory;
  description: string | null;
}

interface CategoryOption {
  id: TeamCategory;
  labelKey: TranslationKey;
}

/**
 * Modal partilhado entre a criação na lista e a edição no detalhe.
 *
 * O evento só é editável na criação: uma equipa pertence a um evento e
 * mudar essa associação exigiria reavaliar permissoes e tarefas.
 */
@Component({
  selector: 'app-team-form-dialog',
  imports: [ReactiveFormsModule, FaIconComponent],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[100] grid place-items-center overflow-y-auto p-4">
        <button
          type="button"
          class="absolute inset-0 bg-canvas/70 backdrop-blur-md"
          [attr.aria-label]="i18n.t('common.close')"
          (click)="cancel.emit()"
        ></button>

        <form
          role="dialog"
          aria-modal="true"
          data-testid="team-form-dialog"
          [attr.aria-label]="title()"
          class="relative w-full max-w-lg rounded-4xl border border-line bg-surface-solid/95 p-5 shadow-card backdrop-blur-2xl animate-rise sm:p-6"
          [formGroup]="form"
          (ngSubmit)="submit()"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
                {{ title() }}
              </h2>
              <p class="mt-1 text-xs leading-5 text-muted">{{ i18n.t('teams.form.hint') }}</p>
            </div>
            <button
              type="button"
              class="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface-raised text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              [attr.aria-label]="i18n.t('common.close')"
              (click)="cancel.emit()"
            >
              <fa-icon [icon]="icons['close']" class="text-xs" aria-hidden="true" />
            </button>
          </div>

          <div class="mt-5 flex flex-col gap-3">
            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {{ i18n.t('teams.form.event') }}
              </span>
              <select
                formControlName="eventId"
                data-testid="team-form-event"
                class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/60 disabled:opacity-60"
              >
                @if (!team()) {
                  <option value="">{{ i18n.t('teams.allEvents') }}</option>
                }
                @for (event of events(); track event.id) {
                  <option [value]="event.id">{{ event.title }}</option>
                }
              </select>
            </label>

            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {{ i18n.t('teams.form.name') }}
              </span>
              <input
                formControlName="name"
                type="text"
                maxlength="80"
                autocomplete="off"
                data-testid="team-form-name"
                class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/60"
                [placeholder]="i18n.t('teams.form.namePlaceholder')"
              />
              @if (form.controls.name.touched && form.controls.name.invalid) {
                <span class="mt-1 block text-[10px] text-coral">
                  {{
                    form.controls.name.hasError('maxlength')
                      ? i18n.t('teams.form.nameMax')
                      : i18n.t('teams.form.nameRequired')
                  }}
                </span>
              }
            </label>

            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {{ i18n.t('teams.form.category') }}
              </span>
              <select
                formControlName="category"
                data-testid="team-form-category"
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
              <textarea
                formControlName="description"
                rows="3"
                maxlength="500"
                data-testid="team-form-description"
                class="w-full resize-none rounded-xl border border-line bg-surface-raised px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/60"
                [placeholder]="i18n.t('teams.form.descriptionPlaceholder')"
              ></textarea>
            </label>
          </div>

          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink transition hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              (click)="cancel.emit()"
            >
              {{ i18n.t('common.cancel') }}
            </button>
            <button
              type="submit"
              data-testid="team-form-submit"
              [disabled]="saving() || form.invalid"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              <fa-icon [icon]="icons['check']" class="text-[10px]" aria-hidden="true" />
              {{ team() ? i18n.t('teams.form.save') : i18n.t('teams.form.create') }}
            </button>
          </div>
        </form>
      </div>
    }
  `,
})
export class TeamFormDialogComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly open = input(false);
  readonly team = input<Team | null>(null);
  readonly events = input<HostEvent[]>([]);
  readonly defaultEventId = input('');
  readonly saving = input(false);

  readonly saved = output<TeamFormValue>();
  readonly cancel = output<void>();

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
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.resetForm();
      }
    });
  }

  protected title(): string {
    return this.i18n.t(this.team() ? 'teams.form.editTitle' : 'teams.form.createTitle');
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saved.emit({
      eventId: value.eventId,
      name: value.name.trim(),
      category: value.category,
      description: value.description.trim() || null,
    });
  }

  private resetForm(): void {
    const team = this.team();
    this.form.reset({
      eventId: team?.eventId ?? this.defaultEventId(),
      name: team?.name ?? '',
      category: team?.category ?? 'outra',
      description: team?.description ?? '',
    });
    // O evento é fixo na edição: desativar o controlo (em vez do atributo
    // `disabled` no template) evita o aviso do Angular com forms reativos.
    // `submit()` usa `getRawValue()`, pelo que o valor continua presente.
    if (team) {
      this.form.controls.eventId.disable({ emitEvent: false });
    } else {
      this.form.controls.eventId.enable({ emitEvent: false });
    }
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.cancel.emit();
    }
  }
}
