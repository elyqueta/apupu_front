import { inject, Injectable, signal } from '@angular/core';
import { ApiError, toApiError } from '../api/api-error';
import { Resettable, SessionCache } from '../services/session-cache';

const DEFAULT_TTL_MS = 30_000;

export interface LoadOptions {
  /** Ignora o cache e vai sempre ao servidor. */
  force?: boolean;
}

/**
 * Base para repositórios que guardam dados dependentes do anfitrião.
 *
 * - Expõe `data`/`loading`/`error` como signals (compatível com zoneless).
 * - `load()` deduplica pedidos em curso e respeita o `ttl` do cache.
 * - Regista-se automaticamente no `SessionCache`, pelo que é limpo no logout
 *   e no início de uma sessão nova.
 * - Cada instância vive no cliente e os pedidos enviam o cookie via
 *   `apiRequestInterceptor`; nenhuma resposta dependente do utilizador é
 *   guardada em cache partilhada no servidor.
 *
 * O `@Injectable()` sem `providedIn` existe apenas para que as subclasses
 * possam herdar o construtor; a base nunca é injetada diretamente.
 */
@Injectable()
export abstract class CachedRepository<T> implements Resettable {
  private readonly sessions = inject(SessionCache);

  private readonly dataState = signal<T | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<ApiError | null>(null);

  private loadedAt = 0;
  private inFlight: Promise<T> | null = null;

  /** Tempo de vida do cache em milissegundos. */
  protected ttlMs: number = DEFAULT_TTL_MS;

  /**
   * Contador incrementado a cada `reset()`. Uma resposta que chegue depois de a
   * sessão mudar é ignorada, para nunca reintroduzir dados do anfitrião anterior.
   */
  private generation = 0;

  readonly data = this.dataState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  protected constructor() {
    this.sessions.register(this);
  }

  /** Pedido de rede que obtém o valor atual do repositório. */
  protected abstract fetch(): Promise<T>;

  /** Devolve o valor, indo ao servidor se o cache estiver vazio ou expirado. */
  async load(options: LoadOptions = {}): Promise<T> {
    if (!options.force && this.isFresh()) {
      return this.dataState() as T;
    }
    if (this.inFlight) {
      return this.inFlight;
    }

    this.loadingState.set(true);
    this.errorState.set(null);

    const generation = this.generation;
    this.inFlight = this.fetch()
      .then((value) => {
        if (generation === this.generation) {
          this.dataState.set(value);
          this.loadedAt = Date.now();
        }
        return value;
      })
      .catch((error: unknown) => {
        if (generation === this.generation) {
          this.errorState.set(toApiError(error));
        }
        throw error;
      })
      .finally(() => {
        if (generation === this.generation) {
          this.loadingState.set(false);
          this.inFlight = null;
        }
      });

    return this.inFlight;
  }

  /** Marca os dados como obsoletos sem os apagar (recarrega no próximo `load`). */
  invalidate(): void {
    this.loadedAt = 0;
  }

  /** Substitui os dados em memória (após uma mutação, sem novo GET). */
  protected setData(value: T): void {
    this.dataState.set(value);
    this.loadedAt = Date.now();
    this.errorState.set(null);
  }

  /** Atualiza os dados em memória a partir do valor atual. */
  protected mutate(updater: (current: T | null) => T): void {
    this.setData(updater(this.dataState()));
  }

  reset(): void {
    this.generation += 1;
    this.dataState.set(null);
    this.loadingState.set(false);
    this.errorState.set(null);
    this.loadedAt = 0;
    this.inFlight = null;
  }

  private isFresh(): boolean {
    return (
      this.dataState() !== null && this.loadedAt > 0 && Date.now() - this.loadedAt < this.ttlMs
    );
  }
}
