import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { skip } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { Pagination } from '../../core/api/api.models';
import { TaskAssigneeFilter, TaskQuery, TaskStatusFilter } from '../../core/data/tasks.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { WorkspaceTask } from '../../core/models/models';
import { TeamsStore } from '../../core/services/teams.store';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { FilterPanelComponent } from '../../shared/components/filter-panel.component';
import { MobileFabComponent } from '../../shared/components/mobile-fab.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StatGridComponent } from '../../shared/components/stat-grid.component';
import { TaskFormDialogComponent } from '../../shared/components/task-form-dialog.component';

interface TaskFormValue {
  label: string;
  eventId: string;
  teamId: string | null;
  assigneeMemberId: string | null;
}

const PAGE_SIZE = 12;

@Component({
  selector: 'app-tasks-page',
  imports: [
    FaIconComponent,
    FilterPanelComponent,
    MobileFabComponent,
    PageHeaderComponent,
    SkeletonComponent,
    StatCardComponent,
    StatGridComponent,
    TaskFormDialogComponent,
  ],
  templateUrl: './tasks.page.html',
})
export class TasksPage {
  private readonly store = inject(WorkspaceStore);
  private readonly teamsStore = inject(TeamsStore);
  private readonly toasts = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  protected readonly items = signal<WorkspaceTask[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly busyId = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly taskDialogOpen = signal(false);

  protected readonly status = signal<TaskStatusFilter>('all');
  protected readonly assignee = signal<TaskAssigneeFilter>('all');
  protected readonly eventId = signal('');
  protected readonly managerId = signal('');
  protected readonly q = signal('');
  protected readonly page = signal(1);

  protected readonly events = this.store.events;
  protected readonly teams = this.teamsStore.items;
  protected readonly assignees = computed(() =>
    this.store
      .teamMembers()
      .map((manager) => ({
        id: manager.id,
        label: manager.email ?? manager.displayName ?? manager.phone ?? '',
      }))
      .filter((assignee) => assignee.label !== ''),
  );
  protected readonly allTasks = this.store.tasks;
  protected readonly allTasksLoading = this.store.loading;

  protected readonly taskStats = computed(() => {
    const tasks = this.allTasks();
    return {
      total: tasks.length,
      pending: tasks.filter((task) => !task.done).length,
      done: tasks.filter((task) => task.done).length,
    };
  });

  protected readonly statusOptions: Array<{ id: TaskStatusFilter; labelKey: TranslationKey }> = [
    { id: 'all', labelKey: 'tasks.status.all' },
    { id: 'pending', labelKey: 'tasks.status.pending' },
    { id: 'done', labelKey: 'tasks.status.done' },
  ];

  protected readonly assigneeOptions: Array<{ id: TaskAssigneeFilter; labelKey: TranslationKey }> =
    [
      { id: 'all', labelKey: 'tasks.assignee.all' },
      { id: 'host', labelKey: 'tasks.assignee.host' },
      { id: 'manager', labelKey: 'tasks.assignee.manager' },
    ];

  protected readonly hasFilters = computed(
    () =>
      this.status() !== 'all' ||
      this.assignee() !== 'all' ||
      this.eventId() !== '' ||
      this.managerId() !== '' ||
      this.q().trim() !== '',
  );

  /** Em mobile os filtros começam recolhidos; em `md+` estão sempre visíveis. */
  protected readonly filtersOpen = signal(false);

  /** Quantos filtros estão ativos, para o badge do botão "Filtros". */
  protected readonly activeFilterCount = computed(
    () =>
      (this.status() !== 'all' ? 1 : 0) +
      (this.assignee() !== 'all' ? 1 : 0) +
      (this.eventId() ? 1 : 0) +
      (this.managerId() ? 1 : 0) +
      (this.q().trim() ? 1 : 0),
  );

  protected readonly rangeLabel = computed(() => {
    const pagination = this.pagination();
    if (!pagination || pagination.total === 0) {
      return '';
    }
    const start = (pagination.page - 1) * pagination.page_size + 1;
    const end = Math.min(pagination.page * pagination.page_size, pagination.total);
    return `${start}–${end} / ${pagination.total}`;
  });

  constructor() {
    this.store.load({ tasks: true, events: true, team: true });
    void this.teamsStore.load({ pageSize: 100 });

    // Abre já filtrado quando se chega de uma sugestão de pesquisa (`?q=`)
    // ou do filtro por evento (`?evento=` / `?event_id=`).
    const initial = this.readQuery(this.route.snapshot.queryParamMap);
    this.q.set(initial.q);
    this.eventId.set(initial.eventId);
    this.route.queryParamMap.pipe(skip(1), takeUntilDestroyed()).subscribe((params) => {
      const next = this.readQuery(params);
      if (next.q === this.q().trim() && next.eventId === this.eventId()) {
        return;
      }
      this.q.set(next.q);
      this.eventId.set(next.eventId);
      this.managerId.set('');
      this.page.set(1);
      void this.load();
    });

    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const query: TaskQuery = {
        status: this.status(),
        assignee: this.assignee(),
        event_id: this.eventId() || undefined,
        manager_id: this.managerId() || undefined,
        q: this.q().trim() || undefined,
        page: this.page(),
        page_size: PAGE_SIZE,
      };
      const result = await this.store.tasksPage(query);
      this.items.set(result.items);
      this.pagination.set(result.pagination);
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected applyFilters(): void {
    this.page.set(1);
    void this.load();
  }

  protected clearFilters(): void {
    this.status.set('all');
    this.assignee.set('all');
    this.eventId.set('');
    this.managerId.set('');
    this.q.set('');
    this.page.set(1);
    void this.load();
  }

  protected goToPage(page: number): void {
    const pagination = this.pagination();
    if (!pagination || page < 1 || page > pagination.total_pages || page === pagination.page) {
      return;
    }
    this.page.set(page);
    void this.load();
  }

  protected openTaskDialog(): void {
    this.taskDialogOpen.set(true);
  }

  protected closeTaskDialog(): void {
    if (!this.creating()) this.taskDialogOpen.set(false);
  }

  protected async submitTask(value: TaskFormValue): Promise<void> {
    if (this.creating()) return;
    this.creating.set(true);
    try {
      // O repositório de tarefas globais ainda só aceita (label, evento, gestor).
      await this.store.createTask(value.label.trim(), value.eventId || null, value.assigneeMemberId);
      this.taskDialogOpen.set(false);
      this.page.set(1);
      await this.load();
      this.toasts.success(this.i18n.t('tasks.created'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.creating.set(false);
    }
  }

  protected async toggle(task: WorkspaceTask): Promise<void> {
    if (this.busyId()) {
      return;
    }
    this.busyId.set(task.id);
    try {
      await this.store.toggleTask(task.id, !task.done);
      await this.load();
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busyId.set(null);
    }
  }

  protected async remove(task: WorkspaceTask): Promise<void> {
    if (this.busyId()) {
      return;
    }
    this.busyId.set(task.id);
    try {
      await this.store.removeTask(task.id);
      this.items.update((items) => items.filter((item) => item.id !== task.id));
      await this.load();
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busyId.set(null);
    }
  }

  private readQuery(params: ParamMap): { q: string; eventId: string } {
    return {
      q: params.get('q')?.trim() ?? '',
      eventId: (params.get('evento') ?? params.get('event_id') ?? '').trim(),
    };
  }
}
