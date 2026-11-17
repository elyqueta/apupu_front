import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { toApiError } from '../../core/api/api-error';
import { Pagination } from '../../core/api/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import {
  HostNotification,
  NotificationKind,
  NotificationStatus,
} from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { NotificationPresenter } from '../../shared/services/notification.presenter';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-notifications-page',
  imports: [FormsModule, RouterLink, FaIconComponent, SkeletonComponent],
  templateUrl: './notifications.page.html',
})
export class NotificationsPage {
  private readonly store = inject(WorkspaceStore);
  private readonly toasts = inject(ToastService);
  private readonly presenter = inject(NotificationPresenter);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  protected readonly items = signal<HostNotification[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  protected readonly status = signal<NotificationStatus>('all');
  protected readonly kind = signal<NotificationKind | ''>('');
  protected readonly eventId = signal('');
  protected readonly q = signal('');
  protected readonly page = signal(1);

  protected readonly events = this.store.events;
  protected readonly unread = this.store.unreadNotifications;

  protected readonly kinds: NotificationKind[] = [
    'rsvp_accepted',
    'rsvp_declined',
    'guest_added',
    'reminder_sent',
    'event_created',
    'event_upcoming',
    'rsvp_deadline',
    'task_assigned',
    'task_completed',
  ];

  protected readonly statusOptions: Array<{ id: NotificationStatus; labelKey: TranslationKey }> = [
    { id: 'all', labelKey: 'notifications.status.all' },
    { id: 'unread', labelKey: 'notifications.status.unread' },
    { id: 'read', labelKey: 'notifications.status.read' },
  ];

  protected readonly hasFilters = computed(
    () =>
      this.status() !== 'all' ||
      this.kind() !== '' ||
      this.eventId() !== '' ||
      this.q().trim() !== '',
  );

  protected readonly rangeLabel = computed(() => {
    const pagination = this.pagination();
    if (!pagination || pagination.total === 0) {
      return '';
    }
    const start = (pagination.page - 1) * pagination.page_size + 1;
    const end = Math.min(pagination.page * pagination.page_size, pagination.total);
    return `${start}–${end} / ${pagination.total}`;
  });

  constructor() {
    this.store.load({ notifications: true, events: true });
    void this.load();
  }

  protected icon(kind: string) {
    return this.presenter.icon(kind);
  }

  protected tone(kind: string): string {
    return this.presenter.tone(kind);
  }

  protected route(notification: HostNotification): string[] {
    return this.presenter.route(notification);
  }

  protected kindLabel(kind: NotificationKind | string): string {
    return this.i18n.t(`notifications.kind.${kind}` as TranslationKey);
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.store.notificationsPage({
        status: this.status(),
        kind: this.kind() || undefined,
        event_id: this.eventId() || undefined,
        q: this.q().trim() || undefined,
        page: this.page(),
        page_size: PAGE_SIZE,
      });
      this.items.set(result.items);
      this.pagination.set(result.pagination);
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected applyFilters(): void {
    this.page.set(1);
    void this.load();
  }

  protected clearFilters(): void {
    this.status.set('all');
    this.kind.set('');
    this.eventId.set('');
    this.q.set('');
    this.page.set(1);
    void this.load();
  }

  protected goToPage(page: number): void {
    const pagination = this.pagination();
    if (!pagination || page < 1 || page > pagination.total_pages || page === pagination.page) {
      return;
    }
    this.page.set(page);
    void this.load();
  }

  protected async toggleRead(notification: HostNotification): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.store.markNotificationRead(notification.id, !notification.read);
      this.items.update((items) =>
        items.map((item) =>
          item.id === notification.id ? { ...item, read: !notification.read } : item,
        ),
      );
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  protected async markOpened(notification: HostNotification): Promise<void> {
    if (notification.read) {
      return;
    }
    try {
      await this.store.markNotificationRead(notification.id, true);
      this.items.update((items) =>
        items.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
      );
    } catch {
      // A navegação não deve falhar por causa da marcação de leitura.
    }
  }

  protected async remove(notification: HostNotification): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.store.removeNotification(notification.id);
      this.items.update((items) => items.filter((item) => item.id !== notification.id));
      if (this.items().length === 0 && this.page() > 1) {
        this.page.update((page) => page - 1);
      }
      await this.load();
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  protected async readAll(): Promise<void> {
    if (this.busy() || this.unread() === 0) {
      return;
    }
    this.busy.set(true);
    try {
      await this.store.readAllNotifications();
      this.items.update((items) => items.map((item) => ({ ...item, read: true })));
      this.toasts.success(this.i18n.t('notifications.allRead'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  protected async removeAll(): Promise<void> {
    if (this.busy() || !window.confirm(this.i18n.t('notifications.removeAllConfirm'))) {
      return;
    }
    this.busy.set(true);
    try {
      await this.store.removeAllNotifications();
      this.items.set([]);
      this.pagination.set(null);
      this.toasts.success(this.i18n.t('notifications.removedAll'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
