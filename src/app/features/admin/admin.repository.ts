import { inject, Injectable } from '@angular/core';
import { ApiClient, DownloadFile } from '../../core/api/api-client';
import {
  AdminAuditEntry,
  AdminAuditQuery,
  AdminEvent,
  AdminEventDetail,
  AdminEventsQuery,
  AdminNewsletterQuery,
  AdminNewsletterSubscription,
  AdminOverview,
  AdminPage,
  AdminSupportMessage,
  AdminSupportQuery,
  AdminUser,
  AdminUsersQuery,
  mapAdminActivity,
  mapAdminEvent,
  mapAdminEventDetail,
  mapAdminNewsletterSubscription,
  mapAdminOverview,
  mapAdminSupportMessage,
  mapAdminUser,
} from './admin.models';

/**
 * Acesso aos endpoints `/admin/*`. Toda a paginação e pesquisa é feita na API;
 * o cliente nunca filtra localmente a página já carregada.
 */
@Injectable({ providedIn: 'root' })
export class AdminRepository {
  private readonly api = inject(ApiClient);

  async overview(): Promise<AdminOverview> {
    const response = await this.api.get<Parameters<typeof mapAdminOverview>[0]>('/admin/overview');
    return mapAdminOverview(response);
  }

  async events(query: AdminEventsQuery): Promise<AdminPage<AdminEvent>> {
    const page = await this.api.getPage<Parameters<typeof mapAdminEvent>[0]>('/admin/events', {
      q: query.q,
      status: query.status,
      host: query.host,
      from: query.from,
      to: query.to,
      page: query.page,
      page_size: query.page_size,
    });
    return {
      items: page.data.map(mapAdminEvent),
      pagination: page.pagination,
    };
  }

  async eventDetail(eventId: string): Promise<AdminEventDetail> {
    const response = await this.api.get<Parameters<typeof mapAdminEventDetail>[0]>(
      `/admin/events/${encodeURIComponent(eventId)}`,
    );
    return mapAdminEventDetail(response);
  }

  /** Envia (ou reenvia) o OTP de cancelamento para o e-mail do super admin. */
  async requestCancelOtp(eventId: string): Promise<void> {
    await this.api.post<unknown>(`/admin/events/${encodeURIComponent(eventId)}/cancel/otp`);
  }

  async cancelEvent(eventId: string, reason: string, otp: string): Promise<void> {
    await this.api.post<unknown>(`/admin/events/${encodeURIComponent(eventId)}/cancel`, {
      reason: reason.trim(),
      otp,
    });
  }

  async users(query: AdminUsersQuery): Promise<AdminPage<AdminUser>> {
    const page = await this.api.getPage<Parameters<typeof mapAdminUser>[0]>('/admin/users', {
      q: query.q,
      role: query.role,
      status: query.status,
      from: query.from,
      page: query.page,
      page_size: query.page_size,
    });
    return {
      items: page.data.map(mapAdminUser),
      pagination: page.pagination,
    };
  }

  async userDetail(userId: string): Promise<AdminUser> {
    const response = await this.api.get<Parameters<typeof mapAdminUser>[0]>(
      `/admin/users/${encodeURIComponent(userId)}`,
    );
    return mapAdminUser(response);
  }

  async suspendUser(userId: string): Promise<void> {
    await this.api.post<unknown>(`/admin/users/${encodeURIComponent(userId)}/suspend`);
  }

  async reactivateUser(userId: string): Promise<void> {
    await this.api.post<unknown>(`/admin/users/${encodeURIComponent(userId)}/reactivate`);
  }

  async revokeSessions(userId: string): Promise<void> {
    await this.api.post<unknown>(`/admin/users/${encodeURIComponent(userId)}/revoke-sessions`);
  }

  async audit(query: AdminAuditQuery): Promise<AdminPage<AdminAuditEntry>> {
    const page = await this.api.getPage<Parameters<typeof mapAdminActivity>[0]>('/admin/audit', {
      q: query.q,
      action: query.action,
      from: query.from,
      page: query.page,
      page_size: query.page_size,
    });
    return {
      items: page.data.map(mapAdminActivity),
      pagination: page.pagination,
    };
  }

  async supportMessages(query: AdminSupportQuery): Promise<AdminPage<AdminSupportMessage>> {
    const page = await this.api.getPage<Parameters<typeof mapAdminSupportMessage>[0]>(
      '/admin/support',
      {
        q: query.q,
        status: query.status === 'all' ? undefined : query.status,
        from: query.from,
        to: query.to,
        page: query.page,
        page_size: query.page_size,
      },
    );
    return {
      items: page.data.map(mapAdminSupportMessage),
      pagination: page.pagination,
    };
  }

  async supportMessageDetail(messageId: string): Promise<AdminSupportMessage> {
    const response = await this.api.get<Parameters<typeof mapAdminSupportMessage>[0]>(
      `/admin/support/${encodeURIComponent(messageId)}`,
    );
    return mapAdminSupportMessage(response);
  }

  async resolveSupportMessage(messageId: string): Promise<AdminSupportMessage> {
    const response = await this.api.post<Parameters<typeof mapAdminSupportMessage>[0]>(
      `/admin/support/${encodeURIComponent(messageId)}/resolve`,
    );
    return mapAdminSupportMessage(response);
  }

  async newsletter(query: AdminNewsletterQuery): Promise<AdminPage<AdminNewsletterSubscription>> {
    const page = await this.api.getPage<Parameters<typeof mapAdminNewsletterSubscription>[0]>(
      '/admin/newsletter',
      {
        q: query.q,
        from: query.from,
        to: query.to,
        page: query.page,
        page_size: query.page_size,
      },
    );
    return {
      items: page.data.map(mapAdminNewsletterSubscription),
      pagination: page.pagination,
    };
  }

  /** Remove uma subscrição; a API responde `{ data: { removed: true } }`. */
  async removeNewsletterSubscription(subscriptionId: string): Promise<void> {
    await this.api.deleteWithData<{ removed: boolean }>(
      `/admin/newsletter/${encodeURIComponent(subscriptionId)}`,
    );
  }

  async exportNewsletterCsv(query: AdminNewsletterQuery): Promise<DownloadFile> {
    return this.api.download('/admin/newsletter/export', {
      q: query.q,
      from: query.from,
      to: query.to,
    });
  }
}
