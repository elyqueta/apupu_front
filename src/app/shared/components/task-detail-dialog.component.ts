import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { TeamTask } from '../../core/models/models';
import { ICONS } from '../../core/ui/icons';
import { ModalComponent } from './modal.component';
import { StatusBadgeComponent } from './status-badge.component';

/**
 * Detalhe de uma tarefa (só leitura, bottom sheet no mobile): estado,
 * prioridade, prazo, evento, equipa, responsável, autor persistente e
 * quem concluiu. Partilhado pela página de Tarefas e pelo detalhe da equipa.
 */
@Component({
  selector: 'app-task-detail-dialog',
  imports: [ModalComponent, FaIconComponent, StatusBadgeComponent],
  template: `
    <app-modal
      [open]="!!task()"
      [title]="i18n.t('block11.task.detailsTitle')"
      presentation="sheet"
      (closed)="closed.emit()"
    >
      @if (task(); as item) {
        <div class="flex flex-col gap-4" data-testid="task-detail">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <h3 class="min-w-0 flex-1 break-words font-display text-lg font-semibold text-ink">{{ item.title }}</h3>
            <app-status-badge [value]="item.status" />
          </div>

          <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            @for (row of rows(); track row.label) {
              <div class="min-w-0 rounded-2xl border border-line bg-surface-raised/60 p-3">
                <dt class="flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <fa-icon [icon]="icons[row.icon]" aria-hidden="true" />
                  {{ row.label }}
                </dt>
                <dd class="mt-1 break-words text-sm text-ink" [attr.data-testid]="row.testId">{{ row.value }}</dd>
              </div>
            }
          </dl>

          <section>
            <h4 class="text-xs font-semibold text-muted">{{ i18n.t('block11.task.description') }}</h4>
            <p class="mt-1 whitespace-pre-line break-words text-sm leading-6 text-ink">
              {{ item.description || i18n.t('block11.task.noDescription') }}
            </p>
          </section>
        </div>
      }
    </app-modal>
  `,
})
export class TaskDetailDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly task = input<TeamTask | null>(null);
  readonly closed = output<void>();

  protected readonly rows = computed(() => {
    const task = this.task();
    if (!task) return [];
    const i18n = this.i18n;
    const rows: { label: string; value: string; icon: string; testId: string }[] = [
      {
        label: i18n.t('block11.task.priority'),
        value: i18n.t(`taskPriority.${task.priority}` as TranslationKey),
        icon: 'warning',
        testId: 'task-detail-priority',
      },
      {
        label: i18n.t('block11.task.due'),
        value: task.dueDate ? i18n.calendarDate(task.dueDate) : i18n.t('block11.task.noDue'),
        icon: 'calendar',
        testId: 'task-detail-due',
      },
      {
        label: i18n.t('block11.task.assignee'),
        value: task.assigneeDisplayName || task.assigneeEmail || i18n.t('block11.task.noAssignee'),
        icon: 'user',
        testId: 'task-detail-assignee',
      },
      {
        label: i18n.t('block11.task.createdBy'),
        value: task.createdByName || i18n.t('block11.task.unknownAuthor'),
        icon: 'pen',
        testId: 'task-detail-author',
      },
      {
        label: i18n.t('block11.task.createdOn'),
        value: i18n.shortDate(task.createdAt, 'Africa/Luanda'),
        icon: 'clock',
        testId: 'task-detail-created',
      },
    ];
    if (task.eventTitle) {
      rows.push({ label: i18n.t('block11.task.event'), value: task.eventTitle, icon: 'calendar', testId: 'task-detail-event' });
    }
    if (task.teamName) {
      rows.push({ label: i18n.t('block11.task.team'), value: task.teamName, icon: 'guestGroup', testId: 'task-detail-team' });
    }
    if (task.completedAt) {
      rows.push({
        label: i18n.t('block11.task.completedOn'),
        value: i18n.shortDate(task.completedAt, 'Africa/Luanda'),
        icon: 'check',
        testId: 'task-detail-completed',
      });
      if (task.completedByName) {
        rows.push({
          label: i18n.t('block11.task.completedBy'),
          value: task.completedByName,
          icon: 'userCheck',
          testId: 'task-detail-completed-by',
        });
      }
    }
    return rows;
  });
}
