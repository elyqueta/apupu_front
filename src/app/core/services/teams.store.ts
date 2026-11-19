import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiError, toApiError } from '../api/api-error';
import { Pagination } from '../api/api.models';
import { TeamListQuery, TeamsRepository } from '../data/teams.repository';
import { Team } from '../models/models';
import { Resettable, SessionCache } from './session-cache';

/**
 * Estado da lista de equipas.
 *
 * Guarda a última página carregada e os filtros usados, para que um
 * `refresh()` (após promover/remover/aceitar um convite) repita o mesmo
 * pedido. Regista-se no `SessionCache` para ser limpo no logout e ao
 * trocar de utilizador.
 */
@Injectable({ providedIn: 'root' })
export class TeamsStore implements Resettable {
  private readonly repository = inject(TeamsRepository);
  private readonly sessions = inject(SessionCache);

  private readonly itemsState = signal<Team[]>([]);
  private readonly paginationState = signal<Pagination | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<ApiError | null>(null);

  private generation = 0;
  private lastQuery: TeamListQuery = {};

  readonly items = this.itemsState.asReadonly();
  readonly pagination = this.paginationState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly total = computed(() => this.paginationState()?.total ?? 0);

  constructor() {
    this.sessions.register(this);
  }

  /** Carrega a página pedida; erros ficam em `error` (não rebentam a UI). */
  async load(query: TeamListQuery = this.lastQuery): Promise<void> {
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

  /** Repete o último pedido, ignorando qualquer resposta antiga. */
  refresh(): Promise<void> {
    return this.load(this.lastQuery);
  }

  /** Atualiza uma equipa em memória (após edição/promoção). */
  upsert(team: Team): void {
    this.itemsState.update((items) => {
      const index = items.findIndex((item) => item.id === team.id);
      if (index === -1) {
        return items;
      }
      const next = [...items];
      next[index] = team;
      return next;
    });
  }

  /** Remove uma equipa da página atual (após apagar). */
  remove(teamId: string): void {
    this.itemsState.update((items) => items.filter((item) => item.id !== teamId));
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
