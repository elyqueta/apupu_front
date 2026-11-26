import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { EventPermissions, WorkspaceTask } from '../../../core/models/models';
import { ICONS } from '../../../core/ui/icons';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';

/** Checklist do evento com criação, conclusão e remoção de tarefas. */
@Component({
  selector: 'app-event-tasks-section',
  imports: [FaIconComponent, ConfirmDialogComponent, SkeletonComponent],
  template: `
    <article class="rounded-4xl border border-line bg-surface p-5 shadow-card backdrop-blur-2xl">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-strong">
            {{ i18n.t('eventDetail.tasksTitle') }}
          </p>
          <p class="mt-1 text-xs text-muted">{{ i18n.t('eventDetail.tasksHint') }}</p>
        </div>
        <span class="text-xs font-semibold text-muted">
          {{
            i18n.t('eventDetail.tasksDone', {
              done: doneCount(),
              total: tasks().length,
            })
          }}
        </span>
      </div>

      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label
          class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface-raised/60 px-3 text-xs font-semibold text-ink"
        >
          <input
            type="checkbox"
            class="size-4 accent-brand"
            [checked]="onlyMine()"
            (change)="onOnlyMineChange($event)"
          />
          {{ i18n.t('eventDetail.taskOnlyMine') }}
        </label>
        @if (permissions().canManageTasks) {
          <button
            type="button"
            class="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover"
            (click)="createTask.emit()"
          >
            <fa-icon [icon]="icons['plus']" class="text-xs" aria-hidden="true" />
            {{ i18n.t('eventDetail.newTask') }}
          </button>
        } @else {
          <p class="text-xs text-muted">{{ i18n.t('eventDetail.permissionsHint') }}</p>
        }
      </div>

      @if (loading()) {
        <app-skeleton variant="cards" />
      } @else if (tasks().length === 0) {
        <div class="mt-4 flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface-raised/30 px-5 py-10 text-center">
          <span class="grid size-14 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-brand-strong">
            <fa-icon [icon]="icons['checklist']" class="text-xl" aria-hidden="true" />
          </span>
          <h3 class="mt-4 font-display text-lg font-semibold text-ink">{{ i18n.t('eventDetail.tasksEmptyTitle') }}</h3>
          <p class="mt-1.5 max-w-md text-sm leading-6 text-muted">{{ i18n.t('eventDetail.tasksEmpty') }}</p>
          @if (permissions().canManageTasks) {
            <button
              type="button"
              class="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover"
              (click)="createTask.emit()"
            >
              <fa-icon [icon]="icons['plus']" class="text-xs" aria-hidden="true" />
              {{ i18n.t('eventDetail.newTask') }}
            </button>
          }
        </div>
      } @else {
        <ul class="mt-3 flex flex-col gap-1">
          @for (task of tasks(); track task.id) {
            <li class="flex items-start gap-2">
              <button
                type="button"
                class="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-2xl p-2 text-left transition hover:bg-surface-raised/60 disabled:opacity-60"
                [disabled]="busyId() === task.id"
                [attr.aria-pressed]="task.done"
                [attr.aria-label]="task.label"
                (click)="toggleTask.emit(task)"
              >
                <span
                  class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition"
                  [class]="
                    task.done
                      ? 'border-mint/40 bg-mint/20 text-mint'
                      : 'border-line bg-surface-raised text-transparent'
                  "
                >
                  <fa-icon [icon]="icons['check']" class="text-xs" aria-hidden="true" />
                </span>
                <span class="min-w-0 flex-1">
                  <span
                    class="block text-xs leading-5"
                    [class]="task.done ? 'text-muted line-through' : 'text-ink'"
                  >
                    {{ task.label }}
                  </span>
                  @if (task.managerEmail) {
                    <span
                      class="mt-1 inline-flex items-center gap-1 rounded-full border border-iris/30 bg-iris/10 px-2 py-0.5 text-xs text-iris"
                    >
                      <fa-icon [icon]="icons['user']" class="text-xs" aria-hidden="true" />
                      {{ task.managerEmail }}
                    </span>
                  } @else {
                    <span class="mt-1 inline-flex text-xs text-muted">
                      {{ i18n.t('eventDetail.taskOwn') }}
                    </span>
                  }
                </span>
              </button>
              @if (permissions().canManageTasks) {
                <button
                  type="button"
                  class="mt-1.5 grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:border-coral/40 hover:text-coral disabled:opacity-50"
                  [disabled]="busyId() === task.id"
                  [attr.aria-label]="i18n.t('eventDetail.taskRemove')"
                  [attr.title]="i18n.t('eventDetail.taskRemove')"
                  (click)="requestRemove(task)"
                >
                  <fa-icon [icon]="icons['trash']" class="text-xs" aria-hidden="true" />
                </button>
              }
            </li>
          }
        </ul>
      }

      <app-confirm-dialog
        [open]="removeTarget() !== null"
        [title]="i18n.t('eventDetail.taskRemove')"
        [message]="removeMessage()"
        [confirmLabel]="i18n.t('common.remove')"
        [cancelLabel]="i18n.t('common.cancel')"
        tone="danger"
        (confirmed)="confirmRemove()"
        (cancelled)="removeTarget.set(null)"
      />
    </article>
  `,
})
export class EventTasksSectionComponent {
  readonly tasks = input.required<WorkspaceTask[]>();
  readonly doneCount = input(0);
  readonly permissions = input.required<EventPermissions>();
  readonly busyId = input<string | null>(null);
  readonly onlyMine = input(false);
  readonly loading = input(false);

  readonly createTask = output<void>();
  readonly toggleTask = output<WorkspaceTask>();
  readonly removeTask = output<WorkspaceTask>();
  readonly onlyMineChange = output<boolean>();

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly removeTarget = signal<WorkspaceTask | null>(null);

  /** Não existe ainda uma chave dedicada à confirmação de remoção de tarefa. */
  protected readonly removeMessage = computed(() => {
    const task = this.removeTarget();
    return task ? `${this.i18n.t('eventDetail.taskRemove')}: ${task.label}` : '';
  });

  protected onOnlyMineChange(event: Event): void {
    this.onlyMineChange.emit((event.target as HTMLInputElement).checked);
  }

  protected requestRemove(task: WorkspaceTask): void {
    if (this.permissions().canManageTasks) {
      this.removeTarget.set(task);
    }
  }

  protected confirmRemove(): void {
    const task = this.removeTarget();
    this.removeTarget.set(null);
    if (task) {
      this.removeTask.emit(task);
    }
  }
}
