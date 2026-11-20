import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StatGridComponent } from '../../shared/components/stat-grid.component';
import {
  AdminOverview,
  adminActionLabel,
  adminErrorMessage,
  adminTargetLabel,
} from './admin.models';
import { AdminRepository } from './admin.repository';

/** Cartões de estatísticas e lista curta de atividade recente. */
@Component({
  selector: 'app-admin-overview',
  imports: [FaIconComponent, SkeletonComponent, StatCardComponent, StatGridComponent],
  template: `
    <section data-testid="admin-overview">
      <div class="mb-5">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-strong">
          {{ i18n.t('admin.nav.overview') }}
        </p>
        <h1 class="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
          {{ i18n.t('admin.title') }}
        </h1>
        <p class="mt-1 text-sm text-muted">{{ i18n.t('admin.subtitle') }}</p>
      </div>

      @if (loading()) {
        <app-skeleton variant="dashboard" />
      } @else if (error()) {
        <div
          role="alert"
          data-testid="admin-overview-error"
          class="rounded-3xl border border-coral/30 bg-coral/10 p-5 text-center"
        >
          <p class="text-sm font-semibold text-coral">{{ error() }}</p>
          <button
            type="button"
            class="mt-3 inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink"
            (click)="load()"
          >
            {{ i18n.t('admin.overview.retry') }}
          </button>
        </div>
      } @else {
        <app-stat-grid>
          <app-stat-card
            [label]="i18n.t('admin.overview.stat.users')"
            [value]="data()?.users ?? 0"
            [hint]="i18n.t('admin.overview.stat.usersHint')"
            [icon]="icons['guests']"
            tone="brand"
          />
          <app-stat-card
            [label]="i18n.t('admin.overview.stat.activeEvents')"
            [value]="data()?.activeEvents ?? 0"
            [hint]="i18n.t('admin.overview.stat.activeEventsHint')"
            [icon]="icons['calendar']"
            tone="mint"
          />
          <app-stat-card
            [label]="i18n.t('admin.overview.stat.cancelledEvents')"
            [value]="data()?.cancelledEvents ?? 0"
            [hint]="i18n.t('admin.overview.stat.cancelledEventsHint')"
            [icon]="icons['cancelled']"
            tone="coral"
          />
          <app-stat-card
            [label]="i18n.t('admin.overview.stat.invitations')"
            [value]="data()?.invitations ?? 0"
            [hint]="i18n.t('admin.overview.stat.invitationsHint')"
            [icon]="icons['envelope']"
            tone="iris"
          />
        </app-stat-grid>

        <div class="mt-6 rounded-4xl border border-line bg-surface p-5 shadow-card">
          <div class="flex items-end justify-between gap-3">
            <div>
              <h2 class="font-display text-lg font-semibold text-ink">
                {{ i18n.t('admin.overview.activity.title') }}
              </h2>
              <p class="mt-1 text-xs text-muted">
                {{ i18n.t('admin.overview.activity.subtitle') }}
              </p>
            </div>
          </div>

          @if (!data()?.activity.length) {
            <p
              data-testid="admin-overview-empty"
              class="mt-6 rounded-2xl border border-dashed border-line bg-surface-raised/60 p-6 text-center text-sm text-muted"
            >
              {{ i18n.t('admin.overview.activity.empty') }}
            </p>
          } @else {
            <ul class="mt-5 divide-y divide-line" data-testid="admin-overview-activity">
              @for (item of data()?.activity ?? []; track item.id) {
                <li
                  class="flex flex-wrap items-start gap-3 py-3"
                  [attr.data-testid]="'admin-overview-activity-' + item.id"
                >
                  <span
                    class="grid size-9 shrink-0 place-items-center rounded-xl border border-brand/25 bg-brand/10 text-brand-strong"
                  >
                    <fa-icon [icon]="icons['history']" class="text-xs" aria-hidden="true" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-sm font-semibold text-ink"
                      [attr.data-testid]="'admin-overview-action-' + item.id"
                    >
                      {{ actionLabel(item.action) }}
                    </p>
                    <p class="mt-0.5 text-xs text-muted">
                      {{ i18n.t('admin.overview.activity.performedBy', { who: actor(item) }) }}
                      @if (item.createdAt) {
                        · {{ i18n.dateTime(item.createdAt, timeZone) }}
                      }
                    </p>
                    @if (item.targetId) {
                      <p class="mt-0.5 text-xs text-muted">
                        {{ i18n.t('admin.overview.activity.target', { type: targetLabel(item.targetType) }) }}
                        <span class="font-mono text-[11px]">{{ shortId(item.targetId) }}</span>
                      </p>
                    }
                    @if (item.reason) {
                      <p class="mt-1 line-clamp-2 text-xs text-muted">{{ item.reason }}</p>
                    }
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      }
    </section>
  `,
})
export class AdminOverviewComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly repository = inject(AdminRepository);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly data = signal<AdminOverview | null>(null);
  protected readonly timeZone = 'Africa/Luanda';

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.data.set(await this.repository.overview());
    } catch (error: unknown) {
      this.data.set(null);
      this.error.set(adminErrorMessage(error, this.i18n));
    } finally {
      this.loading.set(false);
    }
  }

  protected actionLabel(action: string): string {
    return adminActionLabel(action, this.i18n);
  }

  protected targetLabel(targetType: string): string {
    return adminTargetLabel(targetType, this.i18n);
  }

  protected actor(item: { actor: string }): string {
    return item.actor || this.i18n.t('admin.overview.activity.adminFallback');
  }

  /** O id completo é longo; a auditoria mantém o valor por inteiro nos detalhes. */
  protected shortId(id: string): string {
    return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
  }
}
