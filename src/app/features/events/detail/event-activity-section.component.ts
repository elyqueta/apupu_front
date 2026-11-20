import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Pagination } from '../../../core/api/api.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { EventActivity, EventPermissions } from '../../../core/models/models';
import { ICONS } from '../../../core/ui/icons';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { ActivityPresenter } from '../../../shared/services/activity.presenter';

interface ActivityRow { item: EventActivity; text: string; icon: IconDefinition; tone: string; }

/** Histórico de atividade do evento, com paginação e remoção opcional. */
@Component({
  selector: 'app-event-activity-section',
  imports: [FaIconComponent, ConfirmDialogComponent, SkeletonComponent],
  template: `
    <section class="rounded-4xl border border-line bg-surface p-5 shadow-card">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-ink">{{ i18n.t('eventDetail.activityTitle') }}</h2>
          <p class="mt-1 truncate text-xs text-muted">{{ eventTitle() }}</p>
        </div>
        <span class="grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-brand">
          <fa-icon [icon]="icons['history']" aria-hidden="true" />
        </span>
      </div>

      @if (loading()) {
        <div class="mt-4"><app-skeleton variant="cards" /></div>
      } @else if (rows().length === 0) {
        <p class="mt-4 rounded-2xl border border-dashed border-line p-4 text-xs text-muted">{{ i18n.t('eventDetail.noActivity') }}</p>
      } @else {
        <ol class="mt-4 flex flex-col gap-1">
          @for (row of rows(); track row.item.id) {
            <li class="flex items-start gap-3 rounded-2xl p-2 transition hover:bg-surface-raised/60">
              <span class="mt-0.5 grid size-11 shrink-0 place-items-center rounded-2xl border" [class]="row.tone">
                <fa-icon [icon]="row.icon" aria-hidden="true" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs leading-5 text-ink">{{ row.text }}</p>
                <p class="mt-0.5 text-xs text-muted">{{ i18n.relative(row.item.at) }}</p>
              </div>
              @if (permissions().canDeleteActivity) {
                <button type="button" class="grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-muted transition hover:border-brand/40 hover:text-ink disabled:opacity-50" [disabled]="busyId() !== null" [attr.aria-label]="i18n.t('common.remove')" (click)="askRemove(row.item)">
                  <fa-icon [icon]="busyId() === row.item.id ? icons['spinner'] : icons['trash']" [class.animate-spin]="busyId() === row.item.id" aria-hidden="true" />
                </button>
              }
            </li>
          }
        </ol>

        @if (pagination(); as page) {
          @if (page.total_pages > 1) {
            <nav class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3" [attr.aria-label]="i18n.t('eventDetail.activityTitle')">
              <button type="button" class="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40 disabled:opacity-50" [disabled]="!canPrevious()" (click)="pageChange.emit(page.page - 1)">
                <fa-icon [icon]="icons['chevronLeft']" aria-hidden="true" /> {{ i18n.t('common.previous') }}
              </button>
              <span class="text-xs text-muted">{{ i18n.t('eventDetail.activityPage', { page: page.page, total: page.total_pages }) }}</span>
              <button type="button" class="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40 disabled:opacity-50" [disabled]="!canNext()" (click)="pageChange.emit(page.page + 1)">
                {{ i18n.t('common.next') }} <fa-icon [icon]="icons['chevronRight']" aria-hidden="true" />
              </button>
            </nav>
          }
        }
      }

      <app-confirm-dialog [open]="pending() !== null" [title]="i18n.t('common.remove')" [message]="i18n.t('management.activityRemoveConfirm')" [confirmLabel]="i18n.t('common.remove')" [cancelLabel]="i18n.t('common.cancel')" tone="danger" (confirmed)="confirmRemove()" (cancelled)="cancelRemove()" />
    </section>
  `,
})
export class EventActivitySectionComponent {
  readonly items = input.required<EventActivity[]>();
  readonly pagination = input<Pagination | null>(null);
  readonly loading = input(false);
  readonly eventTitle = input('');
  readonly permissions = input.required<EventPermissions>();
  readonly busyId = input<string | null>(null);

  readonly remove = output<EventActivity>();
  readonly pageChange = output<number>();

  protected readonly i18n = inject(I18nService);
  private readonly presenter = inject(ActivityPresenter);
  protected readonly icons = ICONS;
  protected readonly pending = signal<EventActivity | null>(null);

  protected readonly rows = computed<ActivityRow[]>(() =>
    this.items().map((item) => ({
      item,
      text: this.presenter.text(item, this.eventTitle()),
      icon: this.presenter.icon(item.kind),
      tone: this.presenter.tone(item.kind),
    })),
  );
  protected readonly canPrevious = computed(() => {
    const page = this.pagination();
    return !!page && page.page > 1 && !this.loading();
  });
  protected readonly canNext = computed(() => {
    const page = this.pagination();
    return !!page && page.page < page.total_pages && !this.loading();
  });

  protected askRemove(item: EventActivity): void {
    if (this.busyId() === null) {
      this.pending.set(item);
    }
  }

  protected cancelRemove(): void {
    this.pending.set(null);
  }

  protected confirmRemove(): void {
    const item = this.pending();
    this.pending.set(null);
    if (item) {
      this.remove.emit(item);
    }
  }
}
