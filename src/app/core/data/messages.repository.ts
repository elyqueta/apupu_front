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
  invitation_id?: string;
  id?: string;
  event_id?: string;
  event?: { id?: string; title?: string };
  guest_name?: string;
  guest_email?: string | null;
  guest_message?: string | null;
  guest_message_at?: string | null;
  message_read_at?: string | null;
  message_answered_at?: string | null;
  message_answer?: string | null;
}

function mapMessage(row: ApiMessageRow): GuestMessage {
  return {
    invitationId: row.invitation_id ?? row.id ?? '',
    eventId: row.event_id ?? row.event?.id ?? '',
    eventTitle: row.event?.title ?? '',
    guestName: row.guest_name ?? '',
    guestEmail: row.guest_email ?? null,
    guestMessage: row.guest_message ?? '',
    sentAt: row.guest_message_at ?? null,
    read: !!row.message_read_at,
    answered: !!row.message_answered_at,
    answer: row.message_answer ?? null,
    answeredAt: row.message_answered_at ?? null,
  };
}

/**
 * Caixa de entrada de mensagens dos convites (`/host/events/:id/messages`).
 * Maçãs de leitura/resposta atualizam o item em memória para feedback imediato.
 */
@Injectable({ providedIn: 'root' })
export class MessagesRepository {
  private readonly api = inject(ApiClient);

  async list(query: MessagesQuery): Promise<MessagesPage> {
    const eventId = query.event_id;
    if (!eventId) {
      return {
        items: [],
        pagination: { page: 1, page_size: 10, total: 0, total_pages: 0 },
      };
    }
    const page = await this.api.getPage<ApiMessageRow>(
      `/host/events/${encodeURIComponent(eventId)}/messages`,
      {
        q: query.q,
        read: query.read === 'all' ? undefined : query.read,
        answered: query.answered === 'all' ? undefined : query.answered,
        from: query.from,
        to: query.to,
        page: query.page,
        page_size: query.page_size,
      },
    );
    return {
      items: page.data.map(mapMessage),
      pagination: page.pagination,
    };
  }

  async setRead(invitationId: string, read: boolean): Promise<void> {
    await this.api.patch(`/host/messages/${encodeURIComponent(invitationId)}/read`, { read });
  }

  async answer(invitationId: string, answer: string): Promise<void> {
    await this.api.patch(`/host/messages/${encodeURIComponent(invitationId)}/answer`, { answer });
  }
}
