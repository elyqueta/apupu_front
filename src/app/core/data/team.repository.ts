import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiHostEventManager } from '../api/api.models';
import { mapHostEventManager } from '../api/mappers';
import { TeamManager } from '../models/models';
import { CachedRepository } from './cached-repository';

/**
 * Equipa global (`GET /host/managers`): todos os gestores activos dos
 * eventos da conta, com o resumo do evento a que pertencem.
 *
 * As mutações continuam a usar as rotas por evento, expostas pelo
 * `WorkspaceStore`; depois de cada uma, a lista é invalidada para voltar a
 * refletir o estado do servidor.
 */
@Injectable({ providedIn: 'root' })
export class TeamRepository extends CachedRepository<TeamManager[]> {
  private readonly api = inject(ApiClient);

  protected async fetch(): Promise<TeamManager[]> {
    const managers = await this.api.get<ApiHostEventManager[]>('/host/managers');
    return managers.map(mapHostEventManager);
  }
}
