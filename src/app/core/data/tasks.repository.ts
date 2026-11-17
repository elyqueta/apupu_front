import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiTask, Pagination } from '../api/api.models';
import { mapTask } from '../api/mappers';
import { WorkspaceTask } from '../models/models';
import { CachedRepository } from './cached-repository';

export type TaskStatusFilter = 'all' | 'pending' | 'done';
export type TaskAssigneeFilter = 'all' | 'host' | 'manager';

export interface TaskQuery {
  event_id?: string;
  status?: TaskStatusFilter;
  assignee?: TaskAssigneeFilter;
  manager_id?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface TaskPage {
  items: WorkspaceTask[];
  pagination: Pagination;
}

/** Tarefas do anfitrião (`/host/tasks`). */
@Injectable({ providedIn: 'root' })
export class TasksRepository extends CachedRepository<WorkspaceTask[]> {
  private readonly api = inject(ApiClient);

  protected async fetch(): Promise<WorkspaceTask[]> {
    const page = await this.api.getPage<ApiTask>('/host/tasks', {
      page: 1,
      page_size: 100,
    });
    return page.data.map(mapTask);
  }

  /** Listagem paginada usada pela página global de tarefas. */
  async listPage(query: TaskQuery = {}): Promise<TaskPage> {
    const page = await this.api.getPage<ApiTask>('/host/tasks', {
      event_id: query.event_id,
      status: query.status,
      assignee: query.assignee,
      manager_id: query.manager_id,
      q: query.q,
      page: query.page,
      page_size: query.page_size,
    });
    return { items: page.data.map(mapTask), pagination: page.pagination };
  }

  async toggle(taskId: string, done?: boolean): Promise<void> {
    const current = this.data()?.find((task) => task.id === taskId);
    const next = done ?? (current ? !current.done : undefined);
    if (next === undefined) {
      return;
    }
    const response = await this.api.patch<ApiTask>(`/host/tasks/${encodeURIComponent(taskId)}`, {
      done: next,
    });
    const updated = mapTask(response);
    this.mutate((tasks) => (tasks ?? []).map((task) => (task.id === taskId ? updated : task)));
  }

  async create(
    label: string,
    eventId: string | null = null,
    managerId: string | null = null,
  ): Promise<WorkspaceTask> {
    const response = await this.api.post<ApiTask>('/host/tasks', {
      label,
      event_id: eventId,
      manager_id: managerId,
    });
    const task = mapTask(response);
    this.mutate((tasks) => [task, ...(tasks ?? [])]);
    return task;
  }

  async remove(taskId: string): Promise<void> {
    await this.api.delete(`/host/tasks/${encodeURIComponent(taskId)}`);
    this.mutate((tasks) => (tasks ?? []).filter((task) => task.id !== taskId));
  }
}
