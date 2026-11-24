import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import {
  ApiCreateManagerResult,
  ApiEvent,
  ApiEventManager,
  ApiManagerInviteResult,
  CreateEventRequest,
} from '../api/api.models';
import {
  contributionFromInput,
  locationFromInput,
  locationFromView,
  mapEvent,
  mapEventManager,
  mapTeam,
} from '../api/mappers';
import {
  CreateEventInput,
  CreateManagerInput,
  EventManager,
  HostEvent,
  ManagerCreationResult,
  ManagerInviteResult,
} from '../models/models';
import { CachedRepository } from './cached-repository';

interface EventCreateEnvelope {
  event: ApiEvent;
  manage_email_status: 'queued' | 'failed';
  deliveries: Array<{ email: string; status: 'queued' }>;
}

export type EventUpdatePatch = Partial<
  Pick<
    HostEvent,
    | 'title'
    | 'venue'
    | 'city'
    | 'message'
    | 'rules'
    | 'dressCode'
    | 'status'
    | 'visibility'
    | 'showAttendeeCount'
    | 'minAge'
    | 'maxAge'
    | 'youtubeVideoId'
    | 'latitude'
    | 'longitude'
    | 'placeLabel'
    | 'useTables'
  >
>;

/**
 * Eventos do anfitrião (`/host/events`). É a fonte de verdade para as listas e
 * para as estatísticas por evento; as mutações atualizam o cache em memória.
 */
@Injectable({ providedIn: 'root' })
export class EventsRepository extends CachedRepository<HostEvent[]> {
  private readonly api = inject(ApiClient);

  protected async fetch(): Promise<HostEvent[]> {
    const page = await this.api.getPage<ApiEvent>('/host/events', {
      page: 1,
      page_size: 100,
      sort: 'starts_at',
      order: 'asc',
    });
    return page.data.map(mapEvent);
  }

  eventById(id: string): HostEvent | null {
    return this.data()?.find((event) => event.id === id) ?? null;
  }

  /**
   * Pesquisa remota para a shell (`GET /host/events?q=`). Não altera o cache:
   * a lista principal continua a usar a página completa carregada por `fetch()`.
   */
  async search(term: string): Promise<HostEvent[]> {
    const page = await this.api.getPage<ApiEvent>('/host/events', {
      q: term,
      page: 1,
      page_size: 5,
      sort: 'starts_at',
      order: 'asc',
    });
    return page.data.map(mapEvent);
  }

  /** Insere ou substitui um evento no cache em memória. */
  upsert(event: HostEvent): void {
    this.mutate((events) => {
      const list = events ?? [];
      return list.some((item) => item.id === event.id)
        ? list.map((item) => (item.id === event.id ? event : item))
        : [event, ...list];
    });
  }

  async create(
    input: CreateEventInput,
  ): Promise<{ event: HostEvent; manageEmailStatus: 'queued' | 'failed' }> {
    const request: CreateEventRequest = {
      event: {
        title: input.title,
        host_name: input.hostName,
        host_email: input.hostEmail,
        category: input.type,
        starts_at: input.startsAt,
        ends_at: input.endsAt ?? undefined,
        timezone: input.timezone,
        location: locationFromInput(input),
        message: input.message,
        rules: input.rules || undefined,
        dress_code: input.dressCode || undefined,
        template_id: input.templateId,
        theme: { mode: 'dark', palette: 'default' },
        contribution: contributionFromInput(input),
        rsvp_deadline: input.rsvpDeadline,
        cover_url: input.coverUrl,
        visibility: input.visibility ?? 'private',
        show_attendee_count: input.visibility === 'public' ? (input.showAttendeeCount ?? false) : false,
        youtube_video_id: input.youtubeVideoId ?? null,
        use_tables: input.useTables ?? false,
        min_age: input.minAge ?? null,
        max_age: input.maxAge ?? null,
        community_id: input.communityId ?? null,
      },
      guests: input.guests.map((guest) => ({
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
      })),
    };
    const response = await this.api.post<EventCreateEnvelope>('/host/events', request);
    const event = mapEvent(response.event);
    this.upsert(event);
    return { event, manageEmailStatus: response.manage_email_status };
  }

  async update(eventId: string, patch: EventUpdatePatch): Promise<HostEvent | null> {
    const current = this.eventById(eventId);
    if (!current) {
      return null;
    }
    const body: Record<string, unknown> = {};
    if (patch.title !== undefined) body['title'] = patch.title;
    if (patch.message !== undefined) body['message'] = patch.message;
    if (patch.rules !== undefined) body['rules'] = patch.rules;
    if (patch.dressCode !== undefined) body['dress_code'] = patch.dressCode;
    if (patch.status !== undefined) {
      body['status'] = patch.status === 'published' ? 'scheduled' : patch.status;
    }
    if (patch.visibility !== undefined) body['visibility'] = patch.visibility;
    if (patch.showAttendeeCount !== undefined) body['show_attendee_count'] = patch.showAttendeeCount;
    if (patch.minAge !== undefined) body['min_age'] = patch.minAge;
    if (patch.maxAge !== undefined) body['max_age'] = patch.maxAge;
    if (patch.youtubeVideoId !== undefined) body['youtube_video_id'] = patch.youtubeVideoId;
    if (patch.useTables !== undefined) body['use_tables'] = patch.useTables;
    if (
      patch.venue !== undefined ||
      patch.city !== undefined ||
      patch.latitude !== undefined ||
      patch.longitude !== undefined ||
      patch.placeLabel !== undefined
    ) {
      body['location'] = locationFromView(current, {
        venue: patch.venue,
        city: patch.city,
        latitude: patch.latitude,
        longitude: patch.longitude,
        placeLabel: patch.placeLabel,
      });
    }
    const response = await this.api.patch<ApiEvent>(
      `/host/events/${encodeURIComponent(eventId)}`,
      body,
    );
    const updated = mapEvent(response);
    this.upsert(updated);
    return updated;
  }

  /**
   * Remove o evento (remoção lógica). Com convidados confirmados o
   * servidor exige `confirmName` igual ao título.
   */
  async remove(eventId: string, confirmName?: string): Promise<void> {
    await this.api.deleteWithBody(`/host/events/${encodeURIComponent(eventId)}`, {
      ...(confirmName !== undefined ? { confirm_name: confirmName } : {}),
    });
    this.mutate((events) => (events ?? []).filter((event) => event.id !== eventId));
  }

  async resendManageLink(eventId: string): Promise<'queued' | 'failed'> {
    const response = await this.api.post<{ manage_email_status: 'queued' | 'failed' }>(
      `/host/events/${encodeURIComponent(eventId)}/manage-link/resend`,
    );
    return response.manage_email_status;
  }

  async listManagers(eventId: string): Promise<EventManager[]> {
    const managers = await this.api.get<ApiEventManager[]>(
      `/host/events/${encodeURIComponent(eventId)}/managers`,
    );
    return managers.map(mapEventManager);
  }

  async addManager(eventId: string, email: string): Promise<ManagerInviteResult> {
    const response = await this.api.post<ApiManagerInviteResult>(
      `/host/events/${encodeURIComponent(eventId)}/managers`,
      { email },
    );
    return {
      manager: mapEventManager(response.manager),
      emailStatus: response.invite_email_status,
      link: response.link,
      accessCode: response.access_code,
    };
  }

  /** Cria equipa + gestor na mesma transação (regra do Bloco 2). */
  async createManagerWithTeam(
    eventId: string,
    input: CreateManagerInput
  ): Promise<ManagerCreationResult> {
    const response = await this.api.post<ApiCreateManagerResult>(
      `/host/events/${encodeURIComponent(eventId)}/managers`,
      {
        team_name: input.teamName,
        team_category: input.teamCategory,
        team_description: input.teamDescription,
        display_name: input.displayName,
        email: input.email,
        phone: input.phone,
        link_expires_at: input.linkExpiresAt,
      },
    );
    return {
      manager: mapEventManager(response.manager),
      team: mapTeam(response.team),
      link: response.link,
      accessCode: response.access_code,
      emailStatus: response.invite_email_status,
    };
  }

  async updateManagerLink(
    eventId: string,
    managerId: string,
    linkExpiresAt: string
  ): Promise<EventManager> {
    const response = await this.api.patch<{ manager: ApiEventManager }>(
      `/host/events/${encodeURIComponent(eventId)}/managers/${encodeURIComponent(managerId)}/link`,
      { link_expires_at: linkExpiresAt },
    );
    return mapEventManager(response.manager);
  }

  async regenerateManagerAccess(
    eventId: string,
    managerId: string
  ): Promise<ManagerCreationResult | ManagerInviteResult> {
    const response = await this.api.post<ApiManagerInviteResult>(
      `/host/events/${encodeURIComponent(eventId)}/managers/${encodeURIComponent(managerId)}/access-code`,
      {},
    );
    return {
      manager: mapEventManager(response.manager),
      emailStatus: response.invite_email_status,
      link: response.link,
      accessCode: response.access_code,
    };
  }

  /**
   * O gestor troca o próprio código sem ter conta de anfitrião. O novo
   * código só é devolvido uma vez e as sessões antigas do evento ficam
   * revogadas (`POST /host/manager/access-code`).
   */
  async rotateOwnManagerAccess(): Promise<ManagerInviteResult> {
    const response = await this.api.post<ApiManagerInviteResult>('/host/manager/access-code', {});
    return {
      manager: mapEventManager(response.manager),
      emailStatus: response.invite_email_status,
      link: response.link,
      accessCode: response.access_code,
    };
  }

  /** Nova validade do link individual do convite (máx. fim do evento + 30 dias). */
  async updateInvitationLink(
    eventId: string,
    invitationId: string,
    expiresAt: string
  ): Promise<void> {
    await this.api.patch(
      `/host/events/${encodeURIComponent(eventId)}/invitations/${encodeURIComponent(invitationId)}/link`,
      { expires_at: expiresAt },
    );
  }

  async revokeManagerLink(eventId: string, managerId: string): Promise<EventManager> {
    const response = await this.api.post<{ manager: ApiEventManager }>(
      `/host/events/${encodeURIComponent(eventId)}/managers/${encodeURIComponent(managerId)}/revoke`,
      {},
    );
    return mapEventManager(response.manager);
  }

  async removeManager(eventId: string, managerId: string): Promise<void> {
    await this.api.delete(
      `/host/events/${encodeURIComponent(eventId)}/managers/${encodeURIComponent(managerId)}`,
    );
  }

  async resendManagerInvite(eventId: string, managerId: string): Promise<ManagerInviteResult> {
    const response = await this.api.post<ApiManagerInviteResult>(
      `/host/events/${encodeURIComponent(eventId)}/managers/${encodeURIComponent(managerId)}/resend`,
    );
    return {
      manager: mapEventManager(response.manager),
      emailStatus: response.invite_email_status,
    };
  }

  /** Define a capa por URL (operação idempotente). */
  async setCoverUrl(eventId: string, coverUrl: string): Promise<HostEvent> {
    const response = await this.api.put<ApiEvent>(
      `/host/events/${encodeURIComponent(eventId)}/cover`,
      { cover_url: coverUrl },
    );
    const updated = mapEvent(response);
    this.upsert(updated);
    return updated;
  }

  /** Carrega a capa por ficheiro, com progresso e cancelamento. */
  uploadCover(
    eventId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): { promise: Promise<HostEvent>; cancel: () => void } {
    const body = new FormData();
    body.append('cover', file);
    const handle = this.api.postFormWithProgress<ApiEvent>(
      `/host/events/${encodeURIComponent(eventId)}/cover/upload`,
      body,
      { onProgress },
    );
    return {
      cancel: handle.cancel,
      promise: handle.promise.then((response) => {
        const updated = mapEvent(response);
        this.upsert(updated);
        return updated;
      }),
    };
  }

  /** Remove a capa (idempotente). */
  async removeCover(eventId: string): Promise<HostEvent> {
    const response = await this.api.deleteWithData<ApiEvent>(
      `/host/events/${encodeURIComponent(eventId)}/cover`,
    );
    const updated = mapEvent(response);
    this.upsert(updated);
    return updated;
  }
}
