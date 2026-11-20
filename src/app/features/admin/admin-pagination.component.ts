import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Pagination } from '../../core/api/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';

/** Paginação partilhada pelas listas de administração (10 por página). */
@Component({
  selector: 'app-admin-pagination',
  imports: [FaIconComponent],
  template: `
    <nav
      class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
      [attr.aria-label]="i18n.t('admin.title')"
    >
      <p class="text-xs text-muted" data-testid="admin-pagination-results">
        {{ i18n.t('admin.pagination.results', { count: total() }) }}
      </p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          data-testid="admin-prev-page"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink transition hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-40"
          [disabled]="!canGoBack()"
          (click)="change(page() - 1)"
        >
          <fa-icon [icon]="icons['arrowLeft']" class="text-xs" aria-hidden="true" />
          {{ i18n.t('common.previous') }}
        </button>
        <span class="min-w-24 text-center text-xs font-semibold text-muted" data-testid="admin-page-label">
          {{ label() }}
        </span>
        <button
          type="button"
          data-testid="admin-next-page"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink transition hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-40"
          [disabled]="!canGoForward()"
          (click)="change(page() + 1)"
        >
          {{ i18n.t('common.next') }}
          <fa-icon [icon]="icons['arrowRight']" class="text-xs" aria-hidden="true" />
        </button>
      </div>
    </nav>
  `,
})
export class AdminPaginationComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly pagination = input<Pagination | null>(null);
  readonly page = input(1);
  readonly pageChange = output<number>();

  protected readonly total = computed(() => this.pagination()?.total ?? 0);
  protected readonly totalPages = computed(() => Math.max(1, this.pagination()?.total_pages ?? 1));
  protected readonly canGoBack = computed(() => this.page() > 1);
  protected readonly canGoForward = computed(() =>
    this.pagination() ? this.page() < this.totalPages() : false,
  );
  protected readonly label = computed(() =>
    this.i18n.t('admin.pagination.label', { page: this.page(), total: this.totalPages() }),
  );

  protected change(value: number): void {
    if (value < 1 || value > this.totalPages() || value === this.page()) {
      return;
    }
    this.pageChange.emit(value);
  }
}
