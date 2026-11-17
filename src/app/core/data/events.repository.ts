import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import {
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
} from '../api/mappers';
import { CreateEventInput, EventManager, HostEvent, ManagerInviteResult } from '../models/models';
import { CachedRepository } from './cached-repository';

interface EventCreateEnvelope {
  event: ApiEvent;
  manage_email_status: 'queued' | 'failed';
  deliveries: Array<{ email: string; status: 'queued' }>;
}

export type EventUpdatePatch = Partial<
  Pick<HostEvent, 'title' | 'venue' | 'city' | 'message' | 'rules' | 'dressCode' | 'status'>
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
        timezone: input.timezone,
        location: locationFromInput(input),
        message: input.message,
        rules: input.rules || undefined,
        dress_code: input.dressCode || undefined,
        template_id: input.templateId,
        theme: { mode: 'dark', palette: 'default' },
        contribution: contributionFromInput(input),
        rsvp_deadline: input.rsvpDeadline,
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
    if (patch.venue !== undefined || patch.city !== undefined) {
      body['location'] = locationFromView(current, {
        venue: patch.venue,
        city: patch.city,
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

  async remove(eventId: string): Promise<void> {
    await this.api.delete(`/host/events/${encodeURIComponent(eventId)}`);
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
    };
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
}
