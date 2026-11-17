import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiInvitation } from '../api/api.models';
import { ApiHostGuest, mapInvitation } from '../api/mappers';
import { AddGuestResult, Guest, GuestInput } from '../models/models';
import { CachedRepository } from './cached-repository';

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

  async add(eventId: string, input: GuestInput): Promise<AddGuestResult> {
    const response = await this.api.post<ApiInvitation>(
      `/host/events/${encodeURIComponent(eventId)}/invitations`,
      { name: input.name, email: input.email, phone: input.phone },
    );
    const guest = mapInvitation(response);
    this.mutate((guests) => [guest, ...(guests ?? [])]);
    return { ok: true, guest };
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
