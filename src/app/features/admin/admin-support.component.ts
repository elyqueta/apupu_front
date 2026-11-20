import { Component, computed, inject, signal } from '@angular/core';
import { Pagination } from '../../core/api/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { ActionMenuComponent, ActionMenuItem } from '../../shared/components/action-menu.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { AdminPaginationComponent } from './admin-pagination.component';
import { AdminSupportDetailDialogComponent } from './admin-support-detail-dialog.component';
import {
  AdminSupportMessage,
  SupportMessageStatus,
  adminErrorMessage,
} from './admin.models';
import { AdminRepository } from './admin.repository';

interface StatusOption {
  value: '' | SupportMessageStatus;
  labelKey: TranslationKey;
}

const PAGE_SIZE = 10;

/** Lista paginada de mensagens de apoio, com detalhe e marcação como resolvida. */
@Component({
  selector: 'app-admin-support',
  imports: [
    ActionMenuComponent,
    SkeletonComponent,
    AdminPaginationComponent,
    AdminSupportDetailDialogComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <section data-testid="admin-support">
      <div class="mb-5">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-strong">
          {{ i18n.t('admin.nav.support') }}
        </p>
        <h1 class="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
          {{ i18n.t('admin.support.title') }}
        </h1>
        <p class="mt-1 text-sm text-muted">{{ i18n.t('admin.support.subtitle') }}</p>
      </div>

      <div class="grid gap-3 rounded-3xl border border-line bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <label class="sm:col-span-2">
          <span class="sr-only">{{ i18n.t('admin.support.search') }}</span>
          <input
            type="search"
            data-testid="admin-support-search"
            [placeholder]="i18n.t('admin.support.search')"
            [value]="search()"
            (input)="onSearch($event)"
            class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <label>
          <span class="sr-only">{{ i18n.t('admin.support.statusLabel') }}</span>
          <select
            data-testid="admin-support-status"
            [value]="status()"
            (change)="onStatus($event)"
            class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
          >
            @for (option of statusOptions; track option.value) {
              <option [value]="option.value">{{ i18n.t(option.labelKey) }}</option>
            }
          </select>
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label>
            <span class="sr-only">{{ i18n.t('admin.support.fromLabel') }}</span>
            <input
              type="date"
              data-testid="admin-support-from"
              [value]="from()"
              (change)="onFrom($event)"
              class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label>
            <span class="sr-only">{{ i18n.t('admin.support.toLabel') }}</span>
            <input
              type="date"
              data-testid="admin-support-to"
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
        <div role="alert" data-testid="admin-support-error" class="mt-5 rounded-3xl border border-coral/30 bg-coral/10 p-5 text-center">
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
        <p data-testid="admin-support-empty" class="mt-5 rounded-3xl border border-dashed border-line p-8 text-center text-sm text-muted">
          {{ i18n.t('admin.support.empty') }}
        </p>
      } @else {
        <ul class="mt-5 grid gap-3" data-testid="admin-support-list">
          @for (message of items(); track message.id) {
            <li
              class="flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-surface p-4 shadow-card"
              [attr.data-testid]="'admin-support-card-' + message.id"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-sm font-semibold text-ink">{{ message.name }}</p>
                  <span
                    class="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    [class]="statusClass(message.status)"
                  >
                    {{ i18n.t(statusLabel(message.status)) }}
                  </span>
                </div>
                <p class="mt-1 break-all text-xs text-muted">{{ message.email }}</p>
                @if (message.createdAt) {
                  <p class="mt-1 text-xs text-muted">
                    {{ i18n.t('admin.support.sent', { date: i18n.dateTime(message.createdAt, timeZone) }) }}
                  </p>
                }
              </div>
              <app-action-menu
                [items]="menuItems(message)"
                [triggerLabel]="i18n.t('admin.support.actions')"
                [disabledHint]="i18n.t('admin.support.resolvedHint')"
                (selected)="onAction(message, $event)"
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

      <app-admin-support-detail-dialog
        [open]="!!detail()"
        [message]="detail()"
        (closed)="closeDetail()"
      />
      <app-confirm-dialog
        [open]="!!resolveTarget()"
        [title]="i18n.t('admin.support.confirmResolveTitle')"
        [message]="confirmMessage()"
        [confirmLabel]="i18n.t('admin.support.confirmResolve')"
        [cancelLabel]="i18n.t('common.cancel')"
        tone="primary"
        (confirmed)="onResolveConfirmed()"
        (cancelled)="resolveTarget.set(null)"
      />
    </section>
  `,
})
export class AdminSupportComponent {
  protected readonly i18n = inject(I18nService);
  private readonly repository = inject(AdminRepository);
  private readonly toasts = inject(ToastService);

  protected readonly search = signal('');
  protected readonly status = signal<'' | SupportMessageStatus>('');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly page = signal(1);
  protected readonly items = signal<AdminSupportMessage[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly detail = signal<AdminSupportMessage | null>(null);
  protected readonly resolveTarget = signal<AdminSupportMessage | null>(null);
  protected readonly timeZone = 'Africa/Luanda';

  protected readonly statusOptions: StatusOption[] = [
    { value: '', labelKey: 'admin.support.allStatuses' },
    { value: 'open', labelKey: 'admin.support.status.open' },
    { value: 'resolved', labelKey: 'admin.support.status.resolved' },
  ];

  protected readonly confirmMessage = computed(() =>
    this.i18n.t('admin.support.confirmResolveMessage', {
      name: this.resolveTarget()?.name ?? '',
    }),
  );

  private requestSeq = 0;
  private detailSeq = 0;
  private resolving = false;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    const seq = ++this.requestSeq;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.repository.supportMessages({
        q: this.search().trim() || undefined,
        status: this.status() || undefined,
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

  protected onStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as '' | SupportMessageStatus);
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

  protected menuItems(message: AdminSupportMessage): ActionMenuItem[] {
    return [
      {
        id: 'detail',
        label: this.i18n.t('admin.support.viewDetails'),
        icon: ICONS['eye'],
      },
      {
        id: 'resolve',
        label: this.i18n.t('admin.support.resolve'),
        icon: ICONS['check'],
        disabled: message.status === 'resolved',
      },
    ];
  }

  protected onAction(message: AdminSupportMessage, action: string): void {
    if (action === 'detail') {
      void this.openDetail(message);
    } else if (action === 'resolve' && message.status !== 'resolved') {
      this.resolveTarget.set(message);
    }
  }

  protected async openDetail(message: AdminSupportMessage): Promise<void> {
    const seq = ++this.detailSeq;
    try {
      const detail = await this.repository.supportMessageDetail(message.id);
      if (seq === this.detailSeq) {
        this.detail.set(detail);
      }
    } catch (error: unknown) {
      if (seq === this.detailSeq) {
        this.toasts.error(adminErrorMessage(error, this.i18n));
      }
    }
  }

  protected closeDetail(): void {
    this.detailSeq++;
    this.detail.set(null);
  }

  protected async onResolveConfirmed(): Promise<void> {
    const target = this.resolveTarget();
    if (!target || this.resolving) {
      return;
    }
    this.resolveTarget.set(null);
    this.resolving = true;
    try {
      await this.repository.resolveSupportMessage(target.id);
      this.toasts.success(this.i18n.t('admin.support.resolvedToast'));
      await this.load();
    } catch (error: unknown) {
      this.toasts.error(adminErrorMessage(error, this.i18n));
    } finally {
      this.resolving = false;
    }
  }

  protected statusLabel(status: SupportMessageStatus): TranslationKey {
    const keys: Record<SupportMessageStatus, TranslationKey> = {
      open: 'admin.support.status.open',
      resolved: 'admin.support.status.resolved',
    };
    return keys[status];
  }

  protected statusClass(status: SupportMessageStatus): string {
    return status === 'resolved'
      ? 'border-mint/30 bg-mint/10 text-mint'
      : 'border-amber/30 bg-amber/10 text-amber';
  }
}
