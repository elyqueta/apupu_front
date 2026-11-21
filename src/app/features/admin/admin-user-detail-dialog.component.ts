import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { DownloadService } from '../../core/services/download.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import {
  AdminRole,
  AdminUserDetail,
  AdminUserStatus,
} from './admin.models';
import { AdminRepository } from './admin.repository';

const ROLE_KEYS: Record<AdminRole, TranslationKey> = {
  host: 'admin.users.role.host',
  manager: 'admin.users.role.manager',
  super_admin: 'admin.users.role.superAdmin',
};

const STATUS_KEYS: Record<AdminUserStatus, TranslationKey> = {
  active: 'admin.users.status.active',
  suspended: 'admin.users.status.suspended',
  deleted: 'admin.users.status.deleted',
};

/**
 * Detalhe de uma conta com o aspecto da página de perfil do anfitrião:
 * capa, avatar, dados, eventos e equipas. Não permite edição.
 */
@Component({
  selector: 'app-admin-user-detail-dialog',
  imports: [
    FaIconComponent,
    AvatarComponent,
    SkeletonComponent,
    StatusBadgeComponent,
    ModalComponent,
  ],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('admin.users.detail.title')"
      presentation="sheet"
      size="lg"
      (closed)="closed.emit()"
    >
      @if (loading()) {
        <div class="py-6" data-testid="admin-user-detail-loading">
          <app-skeleton variant="profile" />
        </div>
      } @else if (user(); as user) {
        <article data-testid="admin-user-profile" class="-mx-5 -mt-4 sm:-mx-6 sm:-mt-4">
          <div
            data-testid="admin-user-cover"
            class="relative h-40 overflow-hidden bg-gradient-to-r from-brand/50 via-aqua/30 to-secondary/50 sm:h-48"
          >
            @if (user.coverUrl) {
              <img
                data-testid="admin-user-cover-image"
                [src]="user.coverUrl!"
                [alt]="i18n.t('admin.users.detail.cover')"
                class="absolute inset-0 size-full object-cover"
              />
            }
            <div
              class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_55%)]"
            ></div>
          </div>

          <div class="px-5 pb-1 sm:px-6">
            <div class="flex flex-wrap items-end justify-between gap-3">
              <div
                data-testid="admin-user-avatar"
                class="relative -mt-14 shrink-0 rounded-full ring-4 ring-surface"
              >
                <app-avatar
                  size="2xl"
                  [name]="user.displayName || user.email"
                  [imageUrl]="user.avatarUrl"
                />
              </div>
              <div class="flex flex-wrap gap-2 pb-1">
                <span
                  class="rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-strong"
                >
                  {{ i18n.t(roleLabel(user.role)) }}
                </span>
                <span
                  class="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                  [class]="statusClass(user.status)"
                >
                  {{ i18n.t(statusLabel(user.status)) }}
                </span>
                @if (user.emailVerifiedAt) {
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-mint"
                  >
                    <fa-icon [icon]="icons['success']" class="text-[9px]" aria-hidden="true" />
                    {{ i18n.t('admin.users.detail.verified') }}
                  </span>
                }
              </div>
            </div>
            <h3 class="mt-3 font-display text-xl font-semibold tracking-tight text-ink">
              {{ user.displayName || i18n.t('common.notAvailable') }}
            </h3>
            <p class="mt-1 break-all text-sm text-muted">{{ user.email }}</p>
          </div>
        </article>

        <dl
          data-testid="admin-user-stats"
          class="mt-5 grid grid-cols-2 gap-y-4 border-t border-line pt-4 sm:grid-cols-3"
        >
          <div class="flex flex-col gap-1 sm:border-l sm:border-line sm:px-4 sm:first:border-l-0 sm:first:pl-0">
            <dd class="font-display text-2xl font-semibold tracking-tight text-ink">
              {{ i18n.number(user.events.length) }}
            </dd>
            <dt class="text-[11px] leading-4 text-muted">
              {{ i18n.t('admin.users.detail.eventsSection') }}
            </dt>
          </div>
          <div class="flex flex-col gap-1 sm:border-l sm:border-line sm:px-4">
            <dd class="font-display text-2xl font-semibold tracking-tight text-ink">
              {{ i18n.number(user.teams.length) }}
            </dd>
            <dt class="text-[11px] leading-4 text-muted">
              {{ i18n.t('admin.users.detail.teamsStat') }}
            </dt>
          </div>
          <div class="flex flex-col gap-1 sm:border-l sm:border-line sm:px-4">
            <dd class="font-display text-2xl font-semibold tracking-tight text-ink">
              {{ i18n.number(guestTotal()) }}
            </dd>
            <dt class="text-[11px] leading-4 text-muted">{{ i18n.t('profile.stats.guests') }}</dt>
          </div>
        </dl>

        <dl data-testid="admin-user-fields" class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
            <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {{ i18n.t('admin.users.detail.phone') }}
            </dt>
            <dd class="mt-1 break-all text-sm text-ink">
              {{ user.phone || i18n.t('common.notAvailable') }}
            </dd>
          </div>
          <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
            <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {{ i18n.t('admin.users.detail.locale') }}
            </dt>
            <dd class="mt-1 text-sm text-ink">{{ user.locale }}</dd>
          </div>
          <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
            <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {{ i18n.t('admin.users.detail.timezone') }}
            </dt>
            <dd class="mt-1 text-sm text-ink">{{ user.timezone }}</dd>
          </div>
          <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
            <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {{ i18n.t('profile.personal.birthDate') }}
            </dt>
            <dd class="mt-1 text-sm text-ink">
              {{ user.birthDate ? i18n.calendarDate(user.birthDate) : i18n.t('common.notAvailable') }}
            </dd>
          </div>
          <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
            <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {{ i18n.t('admin.users.detail.created') }}
            </dt>
            <dd class="mt-1 text-sm text-ink">
              {{ user.createdAt ? i18n.shortDate(user.createdAt, timeZone) : i18n.t('common.notAvailable') }}
            </dd>
          </div>
          <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
            <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {{ i18n.t('admin.users.detail.role') }}
            </dt>
            <dd class="mt-1 text-sm text-ink">{{ i18n.t(roleLabel(user.role)) }}</dd>
          </div>
        </dl>

        <section class="mt-6">
          <h3 class="font-display text-base font-semibold text-ink">
            {{ i18n.t('admin.users.detail.eventsSection') }}
          </h3>
          @if (!user.events.length) {
            <p
              data-testid="admin-user-no-events"
              class="mt-3 rounded-2xl border border-dashed border-line bg-surface-raised/60 p-5 text-center text-sm text-muted"
            >
              {{ i18n.t('admin.users.detail.noEvents') }}
            </p>
          } @else {
            <ul data-testid="admin-user-events" class="mt-3 divide-y divide-line rounded-2xl border border-line">
              @for (event of user.events; track event.id) {
                <li
                  [attr.data-testid]="'admin-user-event-' + event.id"
                  class="flex flex-wrap items-center justify-between gap-3 p-3"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-ink">{{ event.title }}</p>
                    <p class="mt-0.5 text-xs text-muted">
                      {{ event.startsAt ? i18n.shortDate(event.startsAt, timeZone) : i18n.t('common.notAvailable') }}
                      · {{ i18n.t('admin.users.detail.guestCount', { count: event.guestCount }) }}
                    </p>
                  </div>
                  <app-status-badge [value]="event.status" />
                </li>
              }
            </ul>
          }
        </section>

        <section class="mt-6">
          <h3 class="font-display text-base font-semibold text-ink">
            {{ i18n.t('admin.users.detail.teamsSection') }}
          </h3>
          @if (!user.teams.length) {
            <p
              data-testid="admin-user-no-teams"
              class="mt-3 rounded-2xl border border-dashed border-line bg-surface-raised/60 p-5 text-center text-sm text-muted"
            >
              {{ i18n.t('admin.users.detail.noTeams') }}
            </p>
          } @else {
            <ul data-testid="admin-user-teams" class="mt-3 divide-y divide-line rounded-2xl border border-line">
              @for (team of user.teams; track team.id) {
                <li
                  [attr.data-testid]="'admin-user-team-' + team.id"
                  class="flex flex-wrap items-center justify-between gap-3 p-3"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-ink">{{ team.name }}</p>
                    <p class="mt-0.5 text-xs text-muted">
                      {{ team.eventTitle || i18n.t('common.notAvailable') }}
                    </p>
                  </div>
                  <span class="text-xs font-semibold text-muted">
                    {{ i18n.t('admin.users.detail.members', { count: team.memberCount }) }}
                  </span>
                </li>
              }
            </ul>
          }
        </section>
      } @if (user(); as user) {
        <button
          modal-footer
          type="button"
          data-testid="admin-user-export-pdf"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-4 text-sm font-semibold text-brand-strong transition hover:bg-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
          [disabled]="exporting()"
          (click)="exportPdf(user)"
        >
          <fa-icon
            [icon]="icons[exporting() ? 'spinner' : 'download']"
            class="text-xs"
            aria-hidden="true"
          />
          {{ i18n.t(exporting() ? 'admin.users.detail.exporting' : 'admin.users.detail.exportPdf') }}
        </button>
      }
    </app-modal>
  `,
})
export class AdminUserDetailDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly repository = inject(AdminRepository);
  private readonly downloads = inject(DownloadService);
  private readonly toasts = inject(ToastService);

  readonly open = input(false);
  readonly user = input<AdminUserDetail | null>(null);
  readonly loading = input(false);
  readonly closed = output<void>();

  protected readonly exporting = signal(false);
  protected readonly timeZone = 'Africa/Luanda';

  protected readonly guestTotal = computed(() =>
    (this.user()?.events ?? []).reduce((total, event) => total + event.guestCount, 0),
  );

  protected async exportPdf(user: AdminUserDetail): Promise<void> {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    try {
      const file = await this.repository.exportUserReport(user.id);
      this.downloads.save(file, 'conto-contigo_perfil.pdf');
      this.toasts.success(this.i18n.t('admin.users.detail.exported'));
    } catch {
      this.toasts.error(this.i18n.t('admin.users.exportError'));
    } finally {
      this.exporting.set(false);
    }
  }

  protected roleLabel(role: AdminRole): TranslationKey {
    return ROLE_KEYS[role];
  }

  protected statusLabel(status: AdminUserStatus): TranslationKey {
    return STATUS_KEYS[status];
  }

  protected statusClass(status: AdminUserStatus): string {
    if (status === 'suspended' || status === 'deleted') {
      return 'border-coral/30 bg-coral/10 text-coral';
    }
    return 'border-mint/30 bg-mint/10 text-mint';
  }
}
