import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Pagination } from '../../core/api/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { DownloadService } from '../../core/services/download.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { ActionMenuComponent, ActionMenuItem } from '../../shared/components/action-menu.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { AdminPaginationComponent } from './admin-pagination.component';
import {
  AdminNewsletterSubscription,
  adminErrorMessage,
} from './admin.models';
import { AdminRepository } from './admin.repository';

const PAGE_SIZE = 10;
const CSV_FILENAME = 'newsletter.csv';

/** Subscrições de novidades: pesquisa na API, remoção e exportação CSV. */
@Component({
  selector: 'app-admin-newsletter',
  imports: [
    FaIconComponent,
    ActionMenuComponent,
    SkeletonComponent,
    AdminPaginationComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <section data-testid="admin-newsletter">
      <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-strong">
            {{ i18n.t('admin.nav.newsletter') }}
          </p>
          <h1 class="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
            {{ i18n.t('admin.newsletter.title') }}
          </h1>
          <p class="mt-1 text-sm text-muted">{{ i18n.t('admin.newsletter.subtitle') }}</p>
        </div>
        <button
          type="button"
          data-testid="admin-newsletter-export"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-40"
          [disabled]="exporting()"
          (click)="exportCsv()"
        >
          <fa-icon [icon]="icons['download']" class="text-sm" aria-hidden="true" />
          {{ i18n.t('admin.newsletter.export') }}
        </button>
      </div>

      <div class="grid gap-3 rounded-3xl border border-line bg-surface p-4 shadow-card sm:grid-cols-3">
        <label class="sm:col-span-1">
          <span class="sr-only">{{ i18n.t('admin.newsletter.search') }}</span>
          <input
            type="search"
            data-testid="admin-newsletter-search"
            [placeholder]="i18n.t('admin.newsletter.search')"
            [value]="q()"
            (input)="onSearch($event)"
            class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <div class="grid grid-cols-2 gap-3 sm:col-span-2">
          <label>
            <span class="sr-only">{{ i18n.t('admin.newsletter.fromLabel') }}</span>
            <input
              type="date"
              data-testid="admin-newsletter-from"
              [value]="from()"
              (change)="onFrom($event)"
              class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label>
            <span class="sr-only">{{ i18n.t('admin.newsletter.toLabel') }}</span>
            <input
              type="date"
              data-testid="admin-newsletter-to"
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
        <div role="alert" data-testid="admin-newsletter-error" class="mt-5 rounded-3xl border border-coral/30 bg-coral/10 p-5 text-center">
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
        <p data-testid="admin-newsletter-empty" class="mt-5 rounded-3xl border border-dashed border-line p-8 text-center text-sm text-muted">
          {{ i18n.t('admin.newsletter.empty') }}
        </p>
      } @else {
        <ul class="mt-5 grid gap-3" data-testid="admin-newsletter-list">
          @for (subscription of items(); track subscription.id) {
            <li
              class="flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-surface p-4 shadow-card"
              [attr.data-testid]="'admin-newsletter-card-' + subscription.id"
            >
              <div class="min-w-0 flex-1">
                <p class="break-all text-sm font-semibold text-ink">{{ subscription.email }}</p>
                @if (subscription.createdAt) {
                  <p class="mt-1 text-xs text-muted">
                    {{ i18n.t('admin.newsletter.subscribed', { date: i18n.dateTime(subscription.createdAt, timeZone) }) }}
                  </p>
                }
              </div>
              <app-action-menu
                [items]="menuItems()"
                [triggerLabel]="i18n.t('common.moreActions')"
                (selected)="onAction(subscription, $event)"
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

      <app-confirm-dialog
        [open]="!!removeTarget()"
        [title]="i18n.t('admin.newsletter.confirmRemoveTitle')"
        [message]="confirmMessage()"
        [confirmLabel]="i18n.t('admin.newsletter.confirmRemove')"
        [cancelLabel]="i18n.t('common.cancel')"
        tone="danger"
        (confirmed)="onRemoveConfirmed()"
        (cancelled)="removeTarget.set(null)"
      />
    </section>
  `,
})
export class AdminNewsletterComponent {
  protected readonly i18n = inject(I18nService);
  private readonly repository = inject(AdminRepository);
  private readonly downloads = inject(DownloadService);
  private readonly toasts = inject(ToastService);

  protected readonly icons = ICONS;
  protected readonly q = signal('');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly page = signal(1);
  protected readonly items = signal<AdminNewsletterSubscription[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly exporting = signal(false);
  protected readonly removeTarget = signal<AdminNewsletterSubscription | null>(null);
  protected readonly timeZone = 'Africa/Luanda';

  protected readonly confirmMessage = computed(() =>
    this.i18n.t('admin.newsletter.confirmRemoveMessage', {
      email: this.removeTarget()?.email ?? '',
    }),
  );

  private requestSeq = 0;
  private removing = false;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    const seq = ++this.requestSeq;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.repository.newsletter({
        q: this.q().trim() || undefined,
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
    this.q.set((event.target as HTMLInputElement).value);
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

  protected menuItems(): ActionMenuItem[] {
    return [
      {
        id: 'remove',
        label: this.i18n.t('admin.newsletter.remove'),
        icon: ICONS['trash'],
        tone: 'danger',
      },
    ];
  }

  protected onAction(subscription: AdminNewsletterSubscription, action: string): void {
    if (action === 'remove') {
      this.removeTarget.set(subscription);
    }
  }

  protected async onRemoveConfirmed(): Promise<void> {
    const target = this.removeTarget();
    if (!target || this.removing) {
      return;
    }
    this.removeTarget.set(null);
    this.removing = true;
    try {
      await this.repository.removeNewsletterSubscription(target.id);
      this.toasts.success(this.i18n.t('admin.newsletter.removedToast'));
      await this.load();
    } catch (error: unknown) {
      this.toasts.error(adminErrorMessage(error, this.i18n));
    } finally {
      this.removing = false;
    }
  }

  protected async exportCsv(): Promise<void> {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    try {
      const file = await this.repository.exportNewsletterCsv({
        q: this.q().trim() || undefined,
        from: this.from() || undefined,
        to: this.to() || undefined,
        page: this.page(),
        page_size: PAGE_SIZE,
      });
      this.downloads.save(file, CSV_FILENAME);
    } catch {
      this.toasts.error(this.i18n.t('admin.newsletter.exportError'));
    } finally {
      this.exporting.set(false);
    }
  }
}
