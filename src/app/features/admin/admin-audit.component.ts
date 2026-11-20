import { Component, inject, signal } from '@angular/core';
import { Pagination } from '../../core/api/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { AdminPaginationComponent } from './admin-pagination.component';
import {
  AdminAuditEntry,
  adminActionLabel,
  adminErrorMessage,
  adminTargetLabel,
} from './admin.models';
import { AdminRepository } from './admin.repository';

const PAGE_SIZE = 10;

/** Registo de auditoria: lista paginada e só de leitura. */
@Component({
  selector: 'app-admin-audit',
  imports: [SkeletonComponent, AdminPaginationComponent],
  template: `
    <section data-testid="admin-audit">
      <div class="mb-5">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-strong">
          {{ i18n.t('admin.nav.audit') }}
        </p>
        <h1 class="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
          {{ i18n.t('admin.audit.title') }}
        </h1>
        <p class="mt-1 text-sm text-muted">{{ i18n.t('admin.audit.subtitle') }}</p>
      </div>

      <div class="grid gap-3 rounded-3xl border border-line bg-surface p-4 shadow-card sm:grid-cols-3">
        <label>
          <span class="sr-only">{{ i18n.t('admin.audit.search') }}</span>
          <input
            type="search"
            data-testid="admin-audit-search"
            [placeholder]="i18n.t('admin.audit.search')"
            [value]="q()"
            (input)="onInput('q', $event)"
            class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <label>
          <span class="sr-only">{{ i18n.t('admin.audit.actionLabel') }}</span>
          <input
            type="search"
            data-testid="admin-audit-action"
            [placeholder]="i18n.t('admin.audit.actionLabel')"
            [value]="action()"
            (input)="onInput('action', $event)"
            class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <label>
          <span class="sr-only">{{ i18n.t('admin.audit.fromLabel') }}</span>
          <input
            type="date"
            data-testid="admin-audit-from"
            [value]="from()"
            (change)="onFrom($event)"
            class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
      </div>

      @if (loading()) {
        <div class="mt-5"><app-skeleton variant="cards" /></div>
      } @else if (error()) {
        <div role="alert" data-testid="admin-audit-error" class="mt-5 rounded-3xl border border-coral/30 bg-coral/10 p-5 text-center">
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
        <p data-testid="admin-audit-empty" class="mt-5 rounded-3xl border border-dashed border-line p-8 text-center text-sm text-muted">
          {{ i18n.t('admin.audit.empty') }}
        </p>
      } @else {
        <ul class="mt-5 grid gap-3" data-testid="admin-audit-list">
          @for (entry of items(); track entry.id) {
            <li
              class="rounded-3xl border border-line bg-surface p-4 shadow-card"
              [attr.data-testid]="'admin-audit-entry-' + entry.id"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <p
                    class="text-sm font-semibold text-ink"
                    [attr.data-testid]="'admin-audit-actor-' + entry.id"
                  >
                    {{ entry.actor || i18n.t('admin.audit.unknownActor') }}
                  </p>
                  <p
                    class="mt-1 text-sm text-muted"
                    [attr.data-testid]="'admin-audit-action-' + entry.id"
                  >
                    {{ actionLabel(entry.action) }}
                  </p>
                  @if (entry.targetId) {
                    <p class="mt-1 text-xs text-muted">
                      {{ targetLabel(entry.targetType) }}
                      <span class="font-mono">{{ shortId(entry.targetId) }}</span>
                    </p>
                  }
                  @if (entry.reason) {
                    <p class="mt-2 rounded-xl bg-surface-raised p-2 text-xs text-muted">
                      <span class="font-semibold">{{ i18n.t('admin.audit.reason') }}:</span> {{ entry.reason }}
                    </p>
                  }
                </div>
                @if (entry.createdAt) {
                  <time class="shrink-0 text-xs text-muted" [attr.datetime]="entry.createdAt">
                    {{ i18n.dateTime(entry.createdAt, timeZone) }}
                  </time>
                }
              </div>
            </li>
          }
        </ul>
        <app-admin-pagination
          [pagination]="pagination()"
          [page]="page()"
          (pageChange)="goToPage($event)"
        />
      }
    </section>
  `,
})
export class AdminAuditComponent {
  protected readonly i18n = inject(I18nService);
  private readonly repository = inject(AdminRepository);

  protected readonly q = signal('');
  protected readonly action = signal('');
  protected readonly from = signal('');
  protected readonly page = signal(1);
  protected readonly items = signal<AdminAuditEntry[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly timeZone = 'Africa/Luanda';

  private requestSeq = 0;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    const seq = ++this.requestSeq;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.repository.audit({
        q: this.q().trim() || undefined,
        action: this.action().trim() || undefined,
        from: this.from() || undefined,
        page: this.page(),
        page_size: PAGE_SIZE,
      });
      if (seq !== this.requestSeq) return;
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

  protected onInput(field: 'q' | 'action', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'q') this.q.set(value);
    else this.action.set(value);
    this.page.set(1);
    void this.load();
  }

  protected onFrom(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    void this.load();
  }

  protected goToPage(value: number): void {
    this.page.set(value);
    void this.load();
  }

  protected actionLabel(action: string): string {
    return adminActionLabel(action, this.i18n);
  }

  protected targetLabel(targetType: string): string {
    return adminTargetLabel(targetType, this.i18n);
  }

  protected shortId(id: string): string {
    return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
  }
}
