import { Injectable } from '@angular/core';

/**
 * Contrato mínimo que um cache dependente da sessão tem de cumprir para poder
 * ser limpo quando a sessão muda (logout ou login com outro utilizador).
 */
export interface Resettable {
  /** Descarta os dados em memória e volta ao estado inicial. */
  reset(): void;
}

/**
 * Registo central dos caches/repositórios que guardam dados dependentes do
 * utilizador. O `AuthService` chama `resetAll()` no logout e no início de uma
 * sessão nova, garantindo que nenhum dado do anfitrião anterior sobrevive.
 *
 * Os serviços registam-se no respetivo construtor e permanecem registados
 * durante todo o ciclo de vida da aplicação (`providedIn: 'root'`).
 */
@Injectable({ providedIn: 'root' })
export class SessionCache {
  private readonly repositories = new Set<Resettable>();

  register(repository: Resettable): void {
    this.repositories.add(repository);
  }

  unregister(repository: Resettable): void {
    this.repositories.delete(repository);
  }

  /** Limpa todos os caches registados. Seguro de chamar quando estão vazios. */
  resetAll(): void {
    for (const repository of this.repositories) {
      repository.reset();
    }
  }
}
