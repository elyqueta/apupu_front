import { inject, Injectable, signal } from '@angular/core';
import { ApiClient } from '../api/api-client';
import {
  ApiNotification,
  ApiNotificationPage,
  Pagination,
} from '../api/api.models';
import { mapNotification } from '../api/mappers';
import {
  HostNotification,
  NotificationKind,
  NotificationStatus,
} from '../models/models';
import { CachedRepository } from './cached-repository';

export interface NotificationQuery {
  status?: NotificationStatus;
  kind?: NotificationKind;
  event_id?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface NotificationPage {
  items: HostNotification[];
  pagination: Pagination;
  unreadCount: number;
}

const LATEST_PAGE_SIZE = 8;

/**
 * Notificações in-app da conta (`/host/notifications`).
 *
 * O cache guarda as mais recentes para o painel do sino; a página dedicada
 * usa `listPage()` para obter resultados paginados e filtrados. A contagem de
 * não lidas é mantida em sincronia com as mutações.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsRepository extends CachedRepository<HostNotification[]> {
  private readonly api = inject(ApiClient);
  private readonly unreadState = signal(0);

  readonly unreadCount = this.unreadState.asReadonly();

  protected async fetch(): Promise<HostNotification[]> {
    const page = (await this.api.getPage<ApiNotification>('/host/notifications', {
      status: 'all',
      page: 1,
      page_size: LATEST_PAGE_SIZE,
    })) as ApiNotificationPage;
    this.unreadState.set(page.unread_count ?? 0);
    return page.data.map(mapNotification);
  }

  async listPage(query: NotificationQuery = {}): Promise<NotificationPage> {
    const page = (await this.api.getPage<ApiNotification>('/host/notifications', {
      status: query.status,
      kind: query.kind,
      event_id: query.event_id,
      q: query.q,
      page: query.page,
      page_size: query.page_size,
    })) as ApiNotificationPage;
    this.unreadState.set(page.unread_count ?? 0);
    return {
      items: page.data.map(mapNotification),
      pagination: page.pagination,
      unreadCount: page.unread_count ?? 0,
    };
  }

  async refreshUnread(): Promise<number> {
    const response = await this.api.get<{ unread_count: number }>(
      '/host/notifications/unread-count',
    );
    this.unreadState.set(response.unread_count);
    return response.unread_count;
  }

  async setRead(notificationId: string, read: boolean): Promise<HostNotification> {
    const response = await this.api.patch<ApiNotification>(
      `/host/notifications/${encodeURIComponent(notificationId)}`,
      { read },
    );
    const updated = mapNotification(response);
    this.mutate((items) =>
      (items ?? []).map((item) => (item.id === notificationId ? updated : item)),
    );
    this.adjustUnread(read ? -1 : 1);
    return updated;
  }

  async remove(notificationId: string): Promise<void> {
    const wasUnread = this.data()?.some((item) => item.id === notificationId && !item.read);
    await this.api.delete(`/host/notifications/${encodeURIComponent(notificationId)}`);
    this.mutate((items) => (items ?? []).filter((item) => item.id !== notificationId));
    if (wasUnread) {
      this.adjustUnread(-1);
    }
  }

  async readAll(): Promise<void> {
    await this.api.postNoContent('/host/notifications/read-all');
    const now = new Date().toISOString();
    this.mutate((items) => (items ?? []).map((item) => ({ ...item, read: true, readAt: now })));
    this.unreadState.set(0);
  }

  async removeAll(): Promise<void> {
    await this.api.delete('/host/notifications');
    this.setData([]);
    this.unreadState.set(0);
  }

  private adjustUnread(delta: number): void {
    this.unreadState.update((count) => Math.max(0, count + delta));
  }
}
