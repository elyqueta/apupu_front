import { Component, computed, effect, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { HostEvent, Team } from '../../core/models/models';
import { ModalComponent } from './modal.component';

/** Formulário único de criação de tarefa, usado pelo painel do evento, equipa e /tarefas. */
@Component({
  selector: 'app-task-form-dialog',
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('teamDetail.taskFormTitle')"
      [dismissible]="!saving()"
      size="md"
      (closed)="close()"
    >
      <form id="app-task-form-dialog" [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-muted">
            {{ i18n.t('tasks.newLabel') }}
          </span>
          <input
            formControlName="label"
            type="text"
            maxlength="200"
            autocomplete="off"
            data-testid="task-label"
            class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/60"
            [placeholder]="i18n.t('tasks.newPlaceholder')"
            [attr.aria-label]="i18n.t('tasks.newLabel')"
            [attr.aria-invalid]="form.controls.label.invalid ? 'true' : null"
          />
        </label>

        @if (context() === 'tasks') {
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">
              {{ i18n.t('tasks.event') }}
            </span>
            <select
              formControlName="eventId"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50"
              [attr.aria-label]="i18n.t('tasks.event')"
            >
              <option value="">{{ i18n.t('tasks.noEvent') }}</option>
              @for (event of events(); track event.id) {
                <option [value]="event.id">{{ event.title }}</option>
              }
            </select>
          </label>
        }

        @if (context() === 'tasks' || context() === 'team') {
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">
              {{ i18n.t('teams.statTeams') }}
            </span>
            <select
              formControlName="teamId"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50"
              [attr.aria-label]="i18n.t('teams.statTeams')"
            >
              <option value="">{{ i18n.t('common.none') }}</option>
              @for (team of visibleTeams(); track team.id) {
                <option [value]="team.id">{{ team.name }}</option>
              }
            </select>
          </label>
        }

        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-muted">
            {{ i18n.t('tasks.manager') }}
          </span>
          <select
            formControlName="assigneeMemberId"
            class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50"
            [attr.aria-label]="i18n.t('tasks.manager')"
          >
            <option value="">{{ i18n.t('common.none') }}</option>
            @for (assignee of assignees(); track assignee.id) {
              <option [value]="assignee.id">{{ assignee.label }}</option>
            }
          </select>
        </label>
      </form>

      <div modal-footer class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink transition hover:border-brand/40"
          [disabled]="saving()"
          (click)="close()"
        >
          {{ i18n.t('common.cancel') }}
        </button>
        <button
          type="submit"
          form="app-task-form-dialog"
          data-testid="task-submit"
          class="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          [disabled]="saving() || form.invalid"
          [attr.aria-label]="i18n.t('common.save')"
          (click)="markTouched()"
        >
          {{ saving() ? i18n.t('common.saving') : i18n.t('tasks.create') }}
        </button>
      </div>
    </app-modal>
  `,
})
export class TaskFormDialogComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly i18n = inject(I18nService);

  readonly open = input(false);
  readonly events = input<HostEvent[]>([]);
  readonly teams = input<Team[]>([]);
  readonly assignees = input<{ id: string; label: string }[]>([]);
  readonly saving = input(false);
  readonly context = input<'event' | 'team' | 'tasks'>('event');
  readonly eventId = input('');

  readonly closed = output<void>();
  readonly submitted = output<{
    label: string;
    eventId: string;
    teamId: string | null;
    assigneeMemberId: string | null;
  }>();

  protected readonly form = this.fb.group({
    label: ['', [Validators.required, Validators.maxLength(200)]],
    eventId: [''],
    teamId: [''],
    assigneeMemberId: [''],
  });

  private readonly selectedEventId = toSignal(this.form.controls.eventId.valueChanges, {
    initialValue: '',
  });

  protected readonly effectiveEventId = computed(() =>
    this.context() === 'tasks' ? (this.selectedEventId() || this.eventId()) : this.eventId(),
  );

  protected readonly visibleTeams = computed(() => {
    const eventId = this.effectiveEventId();
    return eventId ? this.teams().filter((team) => team.eventId === eventId) : this.teams();
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.resetForm();
    });
  }

  protected markTouched(): void {
    if (this.form.invalid) this.form.markAllAsTouched();
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitted.emit({
      label: value.label.trim(),
      eventId: this.effectiveEventId(),
      teamId: value.teamId || null,
      assigneeMemberId: value.assigneeMemberId || null,
    });
    this.close();
  }

  protected close(): void {
    this.resetForm();
    this.closed.emit();
  }

  private resetForm(): void {
    this.form.reset({
      label: '',
      eventId: this.eventId(),
      teamId: '',
      assigneeMemberId: '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
