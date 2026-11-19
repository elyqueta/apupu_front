import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiError, toApiError } from '../api/api-error';
import { Pagination } from '../api/api.models';
import {
  CreateTeamTaskInput,
  TeamTaskQuery,
  TeamTasksRepository,
  UpdateTeamTaskInput,
} from '../data/teams.repository';
import { TaskStatus, TeamTask } from '../models/models';
import { Resettable, SessionCache } from './session-cache';

/**
 * Estado das tarefas de uma equipa (ou da lista global).
 *
 * As mutações substituem a tarefa em memória para a UI reagir de imediato;
 * a página decide quando pedir `refresh()` para reconciliar contagens.
 */
@Injectable({ providedIn: 'root' })
export class TeamTasksStore implements Resettable {
  private readonly repository = inject(TeamTasksRepository);
  private readonly sessions = inject(SessionCache);

  private readonly itemsState = signal<TeamTask[]>([]);
  private readonly paginationState = signal<Pagination | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<ApiError | null>(null);

  private generation = 0;
  private lastQuery: TeamTaskQuery = {};

  readonly items = this.itemsState.asReadonly();
  readonly pagination = this.paginationState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly total = computed(() => this.paginationState()?.total ?? 0);

  constructor() {
    this.sessions.register(this);
  }

  async load(query: TeamTaskQuery = this.lastQuery): Promise<void> {
    this.lastQuery = query;
    const generation = ++this.generation;

    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const page = await this.repository.list(query);
      if (generation !== this.generation) {
        return;
      }
      this.itemsState.set(page.items);
      this.paginationState.set(page.pagination);
    } catch (error: unknown) {
      if (generation === this.generation) {
        this.itemsState.set([]);
        this.paginationState.set(null);
        this.errorState.set(toApiError(error));
      }
    } finally {
      if (generation === this.generation) {
        this.loadingState.set(false);
      }
    }
  }

  refresh(): Promise<void> {
    return this.load(this.lastQuery);
  }

  async create(input: CreateTeamTaskInput): Promise<TeamTask> {
    const task = await this.repository.create(input);
    this.itemsState.update((items) => [task, ...items]);
    return task;
  }

  async update(taskId: string, input: UpdateTeamTaskInput): Promise<TeamTask> {
    const task = await this.repository.update(taskId, input);
    this.replace(task);
    return task;
  }

  async setStatus(taskId: string, status: TaskStatus): Promise<TeamTask> {
    const task = await this.repository.setStatus(taskId, status);
    this.replace(task);
    return task;
  }

  async setAssignee(taskId: string, memberId: string): Promise<TeamTask> {
    const task = await this.repository.setAssignee(taskId, memberId);
    this.replace(task);
    return task;
  }

  async move(taskId: string, teamId: string, memberId?: string | null): Promise<TeamTask> {
    const task = await this.repository.move(taskId, teamId, memberId);
    this.replace(task);
    return task;
  }

  async remove(taskId: string): Promise<void> {
    await this.repository.remove(taskId);
    this.itemsState.update((items) => items.filter((item) => item.id !== taskId));
  }

  /** Substituição local para atualizações otimistas (com reversão na página). */
  replace(task: TeamTask): void {
    this.itemsState.update((items) =>
      items.map((item) => (item.id === task.id ? task : item)),
    );
  }

  reset(): void {
    this.generation += 1;
    this.lastQuery = {};
    this.itemsState.set([]);
    this.paginationState.set(null);
    this.loadingState.set(false);
    this.errorState.set(null);
  }
}
