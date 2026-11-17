import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiTask } from '../api/api.models';
import { mapTask } from '../api/mappers';
import { WorkspaceTask } from '../models/models';
import { CachedRepository } from './cached-repository';

/** Tarefas do anfitrião (`/host/tasks`). */
@Injectable({ providedIn: 'root' })
export class TasksRepository extends CachedRepository<WorkspaceTask[]> {
  private readonly api = inject(ApiClient);

  protected async fetch(): Promise<WorkspaceTask[]> {
    const tasks = await this.api.get<ApiTask[]>('/host/tasks');
    return tasks.map(mapTask);
  }

  async toggle(taskId: string): Promise<void> {
    const current = this.data()?.find((task) => task.id === taskId);
    if (!current) {
      return;
    }
    const response = await this.api.patch<ApiTask>(`/host/tasks/${encodeURIComponent(taskId)}`, {
      done: !current.done,
    });
    const updated = mapTask(response);
    this.mutate((tasks) => (tasks ?? []).map((task) => (task.id === taskId ? updated : task)));
  }

  async create(label: string, eventId: string | null = null): Promise<WorkspaceTask> {
    const response = await this.api.post<ApiTask>('/host/tasks', {
      label,
      event_id: eventId,
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
