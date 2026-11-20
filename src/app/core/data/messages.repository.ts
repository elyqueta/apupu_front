import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { Pagination } from '../api/api.models';

/** Uma mensagem de convidado na caixa de entrada do anfitrião. */
export interface GuestMessage {
  invitationId: string;
  eventId: string;
  eventTitle: string;
  guestName: string;
  guestEmail: string | null;
  guestMessage: string;
  sentAt: string | null;
  read: boolean;
  answered: boolean;
  answer: string | null;
  answeredAt: string | null;
}

export interface MessagesQuery {
  /** Filtro local quando a secção do evento fixa o evento. */
  event_id?: string;
  q?: string;
  read?: 'all' | 'read' | 'unread';
  answered?: 'all' | 'answered' | 'unanswered';
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}

export interface MessagesPage {
  items: GuestMessage[];
  pagination: Pagination;
}

interface ApiMessageRow {
  id?: string;
  invitation_id?: string;
  event_id?: string;
  event?: { id?: string; title?: string };
  guest_name?: string;
  guest_email?: string | null;
  guest_message?: string | null;
  rsvp_responded_at?: string | null;
  guest_message_at?: string | null;
  message_read_at?: string | null;
  message_answered_at?: string | null;
  message_answer?: string | null;
}

/**
 * Mapa do `HostGuestDto` devolvido por `GET /host/inbox`.
 *
 * Mantemos `invitation_id`/`guest_message_at` como aliases para tolerar uma
 * versão anterior do contrato; o backend atual usa `id`/`rsvp_responded_at`.
 */
function mapMessage(row: ApiMessageRow): GuestMessage {
  return {
    invitationId: row.id ?? row.invitation_id ?? '',
    eventId: row.event_id ?? row.event?.id ?? '',
    eventTitle: row.event?.title ?? '',
    guestName: row.guest_name ?? '',
    guestEmail: row.guest_email ?? null,
    guestMessage: row.guest_message ?? '',
    sentAt: row.guest_message_at ?? row.rsvp_responded_at ?? null,
    read: !!row.message_read_at,
    answered: !!row.message_answered_at,
    answer: row.message_answer ?? null,
    answeredAt: row.message_answered_at ?? null,
  };
}

/**
 * Caixa de entrada de mensagens dos convites (`/host/inbox`).
 *
 * As atualizações de leitura/resposta são refletidas no item em memória para
 * feedback imediato. O filtro por evento é aplicado no cliente porque a API
 * devolve todos os eventos da conta e dos eventos geridos.
 */
@Injectable({ providedIn: 'root' })
export class MessagesRepository {
  private readonly api = inject(ApiClient);

  async list(query: MessagesQuery): Promise<MessagesPage> {
    const page = await this.api.getPage<ApiMessageRow>('/host/inbox', {
      q: query.q,
      read: query.read === 'all' ? undefined : query.read,
      answered: query.answered === 'all' ? undefined : query.answered,
      from: query.from,
      to: query.to,
      page: query.page,
      page_size: query.page_size,
    });
    return {
      items: page.data.map(mapMessage),
      pagination: page.pagination,
    };
  }

  async setRead(invitationId: string, read: boolean): Promise<void> {
    await this.api.post(`/host/inbox/${encodeURIComponent(invitationId)}/read`, { read });
  }

  async answer(invitationId: string, answer: string): Promise<void> {
    await this.api.post(`/host/inbox/${encodeURIComponent(invitationId)}/answer`, { answer });
  }
}
