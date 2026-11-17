import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiGuestInvitation, mapGuestInvitation } from '../api/mappers';
import { GuestInvitation } from '../models/models';
import { CachedRepository } from './cached-repository';

/**
 * Convites recebidos pela conta autenticada (perspetiva do convidado).
 *
 * ⚠️ Contrato **provisório**: o backend ainda não expõe nenhuma rota para os
 * eventos em que a conta foi convidada. Este repositório aponta para
 * `GET /host/invitations` e é usado diretamente pela página `/convites` (e não
 * através do `WorkspaceStore`), para que uma falha aqui não acione o ecrã de
 * erro global da shell.
 *
 * Ver `docs/prompt-backend-eventos-convidado.md` para o pedido ao backend.
 */
@Injectable({ providedIn: 'root' })
export class GuestInvitationsRepository extends CachedRepository<GuestInvitation[]> {
  private readonly api = inject(ApiClient);

  protected async fetch(): Promise<GuestInvitation[]> {
    // TODO(backend): confirmar a rota e o contrato. Enquanto não existir,
    // a página mostra o estado "área em preparação".
    const page = await this.api.getPage<ApiGuestInvitation>('/host/invitations', {
      page: 1,
      page_size: 100,
      sort: 'starts_at',
      order: 'asc',
    });
    return page.data.map(mapGuestInvitation);
  }
}
