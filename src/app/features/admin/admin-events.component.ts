import { Component, inject, signal } from '@angular/core';
import { Pagination } from '../../core/api/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { ActionMenuComponent, ActionMenuItem } from '../../shared/components/action-menu.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { AdminPaginationComponent } from './admin-pagination.component';
import { AdminCancelDialogComponent } from './admin-cancel-dialog.component';
import { AdminEventDetailDialogComponent } from './admin-event-detail-dialog.component';
import {
  AdminEvent,
  AdminEventDetail,
  AdminEventStatus,
  adminErrorMessage,
} from './admin.models';
import { AdminRepository } from './admin.repository';

interface StatusOption {
  value: '' | AdminEventStatus;
  labelKey: TranslationKey;
}

const PAGE_SIZE = 10;

/** Lista paginada de eventos com pesquisa/filtros na API e cancelamento por OTP. */
@Component({
  selector: 'app-admin-events',
  imports: [
    ActionMenuComponent,
    SkeletonComponent,
    AdminPaginationComponent,
    AdminEventDetailDialogComponent,
    AdminCancelDialogComponent,
  ],
  template: `
    <section data-testid="admin-events">
      <div class="mb-5">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-strong">
          {{ i18n.t('admin.nav.events') }}
        </p>
        <h1 class="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
          {{ i18n.t('admin.events.title') }}
        </h1>
        <p class="mt-1 text-sm text-muted">{{ i18n.t('admin.events.subtitle') }}</p>
      </div>

      <div class="grid gap-3 rounded-3xl border border-line bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-5">
        <label class="sm:col-span-2 lg:col-span-2">
          <span class="sr-only">{{ i18n.t('admin.events.search') }}</span>
          <input
            type="search"
            data-testid="admin-events-search"
            [placeholder]="i18n.t('admin.events.search')"
            [value]="search()"
            (input)="onSearch($event)"
            class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <label>
          <span class="sr-only">{{ i18n.t('admin.events.statusLabel') }}</span>
          <select
            data-testid="admin-events-status"
            [value]="status()"
            (change)="onStatus($event)"
            class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
          >
            @for (option of statusOptions; track option.value) {
              <option [value]="option.value">{{ i18n.t(option.labelKey) }}</option>
            }
          </select>
        </label>
        <label>
          <span class="sr-only">{{ i18n.t('admin.events.hostLabel') }}</span>
          <input
            type="search"
            data-testid="admin-events-host"
            [placeholder]="i18n.t('admin.events.allHosts')"
            [value]="host()"
            (input)="onHost($event)"
            class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label>
            <span class="sr-only">{{ i18n.t('admin.events.fromLabel') }}</span>
            <input
              type="date"
              data-testid="admin-events-from"
              [value]="from()"
              (change)="onFrom($event)"
              class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label>
            <span class="sr-only">{{ i18n.t('admin.events.toLabel') }}</span>
            <input
              type="date"
              data-testid="admin-events-to"
              [value]="to()"
              (change)="onTo($event)"
              class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
        </div>
      </div>

      @if (loading()) {
        <div class="mt-5"><app-skeleton variant="cards" /></div>
      } @else if (error()) {
        <div role="alert" data-testid="admin-events-error" class="mt-5 rounded-3xl border border-coral/30 bg-coral/10 p-5 text-center">
          <p class="text-sm font-semibold text-coral">{{ error() }}</p>
          <button
            type="button"
            class="mt-3 inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink"
            (click)="load()"
          >
            {{ i18n.t('admin.overview.retry') }}
          </button>
        </div>
      } @else if (!items().length) {
        <p data-testid="admin-events-empty" class="mt-5 rounded-3xl border border-dashed border-line p-8 text-center text-sm text-muted">
          {{ i18n.t('admin.events.empty') }}
        </p>
      } @else {
        <ul class="mt-5 grid gap-3" data-testid="admin-events-list">
          @for (event of items(); track event.id) {
            <li
              class="flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-surface p-4 shadow-card"
              [attr.data-testid]="'admin-event-card-' + event.id"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-display text-lg font-semibold text-ink">{{ event.title }}</p>
                  <span
                    class="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    [class]="statusClass(event.status)"
                  >
                    {{ i18n.t(statusLabel(event.status)) }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-muted">
                  {{ event.hostName || i18n.t('admin.events.hostUnknown') }} ·
                  {{ i18n.t('admin.events.guests', { count: event.guestCount }) }}
                </p>
                @if (event.startsAt) {
                  <p class="mt-1 text-xs text-muted">
                    {{ i18n.t('admin.events.starts', { date: i18n.dateTime(event.startsAt, timeZone) }) }}
                  </p>
                }
                @if (event.cancellationReason) {
                  <p class="mt-1 line-clamp-1 text-xs text-coral">{{ event.cancellationReason }}</p>
                }
              </div>
              <app-action-menu
                [items]="menuItems(event)"
                [triggerLabel]="i18n.t('admin.events.actions')"
                [disabledHint]="i18n.t('admin.events.cancelDisabledHint')"
                (selected)="onAction(event, $event)"
              />
            </li>
          }
        </ul>
        <app-admin-pagination
          [pagination]="pagination()"
          [page]="page()"
          (pageChange)="goToPage($event)"
        />
      }

      <app-admin-event-detail-dialog
        [open]="!!detail()"
        [event]="detail()"
        (closed)="detail.set(null)"
      />
      <app-admin-cancel-dialog
        [open]="!!cancelTarget()"
        [event]="cancelTarget()"
        (closed)="cancelTarget.set(null)"
        (cancelled)="onCancelled($event)"
      />
    </section>
  `,
})
export class AdminEventsComponent {
  protected readonly i18n = inject(I18nService);
  private readonly repository = inject(AdminRepository);
  private readonly toasts = inject(ToastService);

  protected readonly search = signal('');
  protected readonly status = signal<'' | AdminEventStatus>('');
  protected readonly host = signal('');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly page = signal(1);
  protected readonly items = signal<AdminEvent[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly detail = signal<AdminEventDetail | null>(null);
  protected readonly cancelTarget = signal<AdminEvent | null>(null);
  protected readonly timeZone = 'Africa/Luanda';

  protected readonly statusOptions: StatusOption[] = [
    { value: '', labelKey: 'admin.events.allStatuses' },
    { value: 'active', labelKey: 'admin.events.status.active' },
    { value: 'completed', labelKey: 'admin.events.status.completed' },
    { value: 'cancelled', labelKey: 'admin.events.status.cancelled' },
  ];

  private requestSeq = 0;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    const seq = ++this.requestSeq;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.repository.events({
        q: this.search().trim() || undefined,
        status: this.status() || undefined,
        host: this.host().trim() || undefined,
        from: this.from() || undefined,
        to: this.to() || undefined,
        page: this.page(),
        page_size: PAGE_SIZE,
      });
      if (seq !== this.requestSeq) {
        return;
      }
      this.items.set(result.items);
      this.pagination.set(result.pagination);
    } catch (error: unknown) {
      if (seq === this.requestSeq) {
        this.items.set([]);
        this.pagination.set(null);
        this.error.set(adminErrorMessage(error, this.i18n));
      }
    } finally {
      if (seq === this.requestSeq) {
        this.loading.set(false);
      }
    }
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    void this.load();
  }

  protected onHost(event: Event): void {
    this.host.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    void this.load();
  }

  protected onStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as '' | AdminEventStatus);
    this.page.set(1);
    void this.load();
  }

  protected onFrom(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    void this.load();
  }

  protected onTo(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    void this.load();
  }

  protected goToPage(value: number): void {
    this.page.set(value);
    void this.load();
  }

  protected menuItems(event: AdminEvent): ActionMenuItem[] {
    const items: ActionMenuItem[] = [
      {
        id: 'detail',
        label: this.i18n.t('admin.events.viewDetails'),
        icon: ICONS['eye'],
      },
      {
        id: 'cancel',
        label: this.i18n.t('admin.events.cancel'),
        icon: ICONS['cancelled'],
        tone: 'danger',
        disabled: event.status === 'cancelled',
      },
    ];
    return items;
  }

  protected onAction(event: AdminEvent, action: string): void {
    if (action === 'detail') {
      void this.openDetail(event);
    } else if (action === 'cancel' && event.status !== 'cancelled') {
      this.cancelTarget.set(event);
    }
  }

  protected async openDetail(event: AdminEvent): Promise<void> {
    try {
      this.detail.set(await this.repository.eventDetail(event.id));
    } catch (error: unknown) {
      this.toasts.error(adminErrorMessage(error, this.i18n));
    }
  }

  protected async onCancelled(event: AdminEvent): Promise<void> {
    this.cancelTarget.set(null);
    this.toasts.success(this.i18n.t('admin.events.cancelledToast', { title: event.title }));
    await this.load();
  }

  protected statusLabel(status: AdminEventStatus): TranslationKey {
    const keys: Record<AdminEventStatus, TranslationKey> = {
      active: 'admin.events.status.active',
      completed: 'admin.events.status.completed',
      cancelled: 'admin.events.status.cancelled',
    };
    return keys[status];
  }

  protected statusClass(status: AdminEventStatus): string {
    if (status === 'cancelled') {
      return 'border-coral/30 bg-coral/10 text-coral';
    }
    if (status === 'completed') {
      return 'border-aqua/30 bg-aqua/10 text-aqua';
    }
    return 'border-mint/30 bg-mint/10 text-mint';
  }
}
