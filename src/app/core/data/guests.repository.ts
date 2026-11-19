import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiInvitation, Pagination } from '../api/api.models';
import { ApiHostGuest, mapInvitation } from '../api/mappers';
import { AddGuestResult, Guest, GuestInput, HostEvent, RsvpStatus } from '../models/models';
import { CachedRepository } from './cached-repository';

export interface GuestsQuery {
  event_id?: string;
  /** Estado da UI; convertido para `rsvp_status` da API. */
  status?: RsvpStatus | 'all';
  q?: string;
  page?: number;
  page_size?: number;
}

export interface GuestListEntry {
  guest: Guest;
  event: HostEvent;
}

export interface GuestPage {
  items: GuestListEntry[];
  pagination: Pagination;
}

/** Estado da UI → valor aceite por `rsvp_status` na API. */
export function toApiRsvpStatus(status: RsvpStatus | 'all'): string | undefined {
  return status === 'all' ? undefined : status === 'confirmed' ? 'accepted' : status;
}

/**
 * Convidados do anfitrião (`GET /host/guests` e `/host/events/:id/invitations`).
 * As mutações mantêm o cache em memória alinhado com o servidor.
 */
@Injectable({ providedIn: 'root' })
export class GuestsRepository extends CachedRepository<Guest[]> {
  private readonly api = inject(ApiClient);

  protected async fetch(): Promise<Guest[]> {
    const page = await this.api.getPage<ApiHostGuest>('/host/guests', {
      page: 1,
      page_size: 100,
    });
    return page.data.map(mapInvitation);
  }

  forEvent(eventId: string): Guest[] {
    return (this.data() ?? []).filter((guest) => guest.eventId === eventId);
  }

  /**
   * Lista paginada e filtrada no servidor (`GET /host/guests`).
   * O resumo do evento devolvido pela API é insuficiente para a formatação de
   * datas, pelo que as páginas completam o `timezone` a partir da store.
   */
  async listPage(query: GuestsQuery = {}): Promise<GuestPage> {
    const page = await this.api.getPage<ApiHostGuest>('/host/guests', {
      event_id: query.event_id,
      rsvp_status: toApiRsvpStatus(query.status ?? 'all'),
      q: query.q,
      page: query.page,
      page_size: query.page_size,
    });
    return {
      items: page.data.map((row) => ({
        guest: mapInvitation(row),
        event: {
          id: row.event.id,
          title: row.event.title,
          startsAt: row.event.starts_at,
          status: row.event.status,
          timezone: 'Africa/Luanda',
        } as HostEvent,
      })),
      pagination: page.pagination,
    };
  }

  async add(eventId: string, input: GuestInput): Promise<AddGuestResult> {
    const response = await this.api.post<ApiInvitation>(
      `/host/events/${encodeURIComponent(eventId)}/invitations`,
      { name: input.name, email: input.email, phone: input.phone },
    );
    const guest = mapInvitation(response);
    this.mutate((guests) => [guest, ...(guests ?? [])]);
    return { ok: true, guest };
  }

  /**
   * Actualiza os dados de um convidado existente.
   *
   * O backend só aceita alterações a `email`/`phone` enquanto o link não
   * foi aberto; depois disso devolve `409 invitation_already_opened`.
   */
  async update(guest: Guest, input: GuestInput): Promise<Guest> {
    const response = await this.api.patch<ApiInvitation>(
      `/host/events/${encodeURIComponent(guest.eventId)}/invitations/${encodeURIComponent(guest.id)}`,
      { name: input.name, email: input.email, phone: input.phone },
    );
    const updated = mapInvitation(response);
    this.mutate((guests) =>
      (guests ?? []).map((item) => (item.id === updated.id ? updated : item)),
    );
    return updated;
  }

  async remove(guestId: string): Promise<void> {
    const guest = this.data()?.find((item) => item.id === guestId);
    if (!guest) {
      return;
    }
    await this.api.delete(
      `/host/events/${encodeURIComponent(guest.eventId)}/invitations/${encodeURIComponent(guestId)}`,
    );
    this.mutate((guests) => (guests ?? []).filter((item) => item.id !== guestId));
  }

  async sendReminder(guestId: string): Promise<boolean> {
    const guest = this.data()?.find((item) => item.id === guestId);
    if (!guest) {
      return false;
    }
    await this.api.post(
      `/host/events/${encodeURIComponent(guest.eventId)}/invitations/${encodeURIComponent(guestId)}/resend`,
    );
    return true;
  }

  /** Remove do cache os convidados de um evento apagado. */
  removeForEvent(eventId: string): void {
    this.mutate((guests) => (guests ?? []).filter((guest) => guest.eventId !== eventId));
  }
}
