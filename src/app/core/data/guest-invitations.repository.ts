import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiGuestInvitation, mapGuestInvitation } from '../api/mappers';
import { GuestInvitation } from '../models/models';
import { CachedRepository } from './cached-repository';

/**
 * Convites recebidos pela conta autenticada (perspetiva do convidado).
 *
 * O backend expõe `GET /host/invitations` apenas para a sessão de conta e
 * associa os convites ao email verificado dessa conta. A página `/convites`
 * injeta este repositório diretamente (e não via `WorkspaceStore`) para que
 * uma falha aqui não acione o ecrã de erro global da shell.
 */
@Injectable({ providedIn: 'root' })
export class GuestInvitationsRepository extends CachedRepository<GuestInvitation[]> {
  private readonly api = inject(ApiClient);

  protected async fetch(): Promise<GuestInvitation[]> {
    const page = await this.api.getPage<ApiGuestInvitation>('/host/invitations', {
      page: 1,
      page_size: 100,
      sort: 'starts_at',
      order: 'asc',
    });
    return page.data.map(mapGuestInvitation);
  }
}
