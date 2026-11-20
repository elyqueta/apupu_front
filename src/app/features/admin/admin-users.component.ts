import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Pagination } from '../../core/api/api.models';
import { AuthService } from '../../core/api/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { AdminPaginationComponent } from './admin-pagination.component';
import { AdminUserDetailDialogComponent } from './admin-user-detail-dialog.component';
import {
  AdminRole,
  AdminUser,
  AdminUserDetail,
  AdminUserStatus,
  adminErrorMessage,
} from './admin.models';
import { AdminRepository } from './admin.repository';

const PAGE_SIZE = 10;

type RoleFilter = '' | AdminRole;
type StatusFilter = '' | AdminUserStatus;
type ConfirmType = 'suspend' | 'revoke';

interface ConfirmState {
  type: ConfirmType;
  user: AdminUser;
}

/** Lista de utilizadores com ações de conta e bloqueio de auto-suspensão. */
@Component({
  selector: 'app-admin-users',
  imports: [
    FaIconComponent,
    AvatarComponent,
    SkeletonComponent,
    ConfirmDialogComponent,
    AdminPaginationComponent,
    AdminUserDetailDialogComponent,
  ],
  template: `
    <section data-testid="admin-users">
      <div class="mb-5">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-strong">
          {{ i18n.t('admin.nav.users') }}
        </p>
        <h1 class="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
          {{ i18n.t('admin.users.title') }}
        </h1>
        <p class="mt-1 text-sm text-muted">{{ i18n.t('admin.users.subtitle') }}</p>
      </div>

      <div class="grid gap-3 rounded-3xl border border-line bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <label class="sm:col-span-2">
          <span class="sr-only">{{ i18n.t('admin.users.search') }}</span>
          <input
            type="search"
            data-testid="admin-users-search"
            [placeholder]="i18n.t('admin.users.search')"
            [value]="search()"
            (input)="onSearch($event)"
            class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <label>
          <span class="sr-only">{{ i18n.t('admin.users.roleLabel') }}</span>
          <select
            data-testid="admin-users-role"
            [value]="role()"
            (change)="onRole($event)"
            class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="">{{ i18n.t('admin.users.allRoles') }}</option>
            <option value="host">{{ i18n.t('admin.users.role.host') }}</option>
            <option value="manager">{{ i18n.t('admin.users.role.manager') }}</option>
            <option value="super_admin">{{ i18n.t('admin.users.role.superAdmin') }}</option>
          </select>
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label>
            <span class="sr-only">{{ i18n.t('admin.users.statusLabel') }}</span>
            <select
              data-testid="admin-users-status"
              [value]="status()"
              (change)="onStatus($event)"
              class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="">{{ i18n.t('admin.users.allStatuses') }}</option>
              <option value="active">{{ i18n.t('admin.users.status.active') }}</option>
              <option value="suspended">{{ i18n.t('admin.users.status.suspended') }}</option>
              <option value="deleted">{{ i18n.t('admin.users.status.deleted') }}</option>
            </select>
          </label>
          <label>
            <span class="sr-only">{{ i18n.t('admin.users.fromLabel') }}</span>
            <input
              type="date"
              data-testid="admin-users-from"
              [value]="from()"
              (change)="onFrom($event)"
              class="min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
        </div>
      </div>

      @if (loading()) {
        <div class="mt-5"><app-skeleton variant="cards" /></div>
      } @else if (error()) {
        <div role="alert" data-testid="admin-users-error" class="mt-5 rounded-3xl border border-coral/30 bg-coral/10 p-5 text-center">
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
        <p data-testid="admin-users-empty" class="mt-5 rounded-3xl border border-dashed border-line p-8 text-center text-sm text-muted">
          {{ i18n.t('admin.users.empty') }}
        </p>
      } @else {
        <ul class="mt-5 grid gap-3" data-testid="admin-users-list">
          @for (user of items(); track user.id) {
            <li
              class="rounded-3xl border border-line bg-surface p-4 shadow-card"
              [attr.data-testid]="'admin-user-card-' + user.id"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex min-w-0 items-start gap-3">
                  <app-avatar
                    size="md"
                    [name]="user.displayName || user.email"
                    [imageUrl]="user.avatarUrl"
                  />
                  <div class="min-w-0">
                    <p class="font-display text-lg font-semibold text-ink">
                      {{ user.displayName || user.email }}
                    </p>
                    <p class="break-all text-xs text-muted">{{ user.email }}</p>
                    <p class="mt-2 text-xs text-muted">
                      {{ i18n.t(roleLabel(user.role)) }} · {{ i18n.t(statusLabel(user.status)) }}
                    </p>
                    <p class="mt-1 text-xs text-muted">
                      {{ i18n.t('admin.users.eventsCreated', { count: user.eventsCreated }) }}
                    </p>
                    @if (user.createdAt) {
                      <p class="mt-1 text-xs text-muted">
                        {{ i18n.t('admin.users.registered', { date: i18n.shortDate(user.createdAt, timeZone) }) }}
                      </p>
                    }
                  </div>
                </div>
                <span
                  class="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                  [class]="statusClass(user.status)"
                >
                  {{ i18n.t(statusLabel(user.status)) }}
                </span>
              </div>
              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="admin-user-view"
                  class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-sm font-semibold text-ink transition hover:border-brand/40"
                  (click)="openDetail(user)"
                >
                  <fa-icon [icon]="icons['eye']" class="text-xs" aria-hidden="true" />
                  {{ i18n.t('admin.users.viewDetails') }}
                </button>
                @if (user.status === 'active') {
                  <button
                    type="button"
                    data-testid="admin-user-suspend"
                    class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-coral/30 bg-coral/10 px-3 text-sm font-semibold text-coral transition hover:bg-coral/20 disabled:cursor-not-allowed disabled:opacity-40"
                    [disabled]="isSelf(user)"
                    [attr.title]="isSelf(user) ? i18n.t('admin.users.selfSuspendHint') : null"
                    (click)="requestSuspend(user)"
                  >
                    <fa-icon [icon]="icons['cancelled']" class="text-xs" aria-hidden="true" />
                    {{ i18n.t('admin.users.suspend') }}
                  </button>
                } @else {
                  <button
                    type="button"
                    data-testid="admin-user-reactivate"
                    class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-mint/30 bg-mint/10 px-3 text-sm font-semibold text-mint transition hover:bg-mint/20"
                    (click)="reactivate(user)"
                  >
                    <fa-icon [icon]="icons['refresh']" class="text-xs" aria-hidden="true" />
                    {{ i18n.t('admin.users.reactivate') }}
                  </button>
                }
                <button
                  type="button"
                  data-testid="admin-user-revoke"
                  class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-sm font-semibold text-ink transition hover:border-brand/40"
                  (click)="requestRevoke(user)"
                >
                  <fa-icon [icon]="icons['lock']" class="text-xs" aria-hidden="true" />
                  {{ i18n.t('admin.users.revoke') }}
                </button>
                @if (isSelf(user)) {
                  <button
                    type="button"
                    data-testid="admin-user-change-role"
                    class="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-sm font-semibold text-muted opacity-60"
                    disabled
                    [attr.title]="i18n.t('admin.users.selfRoleHint')"
                  >
                    <fa-icon [icon]="icons['shield']" class="text-xs" aria-hidden="true" />
                    {{ i18n.t('admin.users.changeRole') }}
                  </button>
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

      <app-admin-user-detail-dialog
        [open]="detailLoading() || !!detail()"
        [user]="detail()"
        [loading]="detailLoading()"
        (closed)="closeDetail()"
      />
      <app-confirm-dialog
        [open]="!!confirm()"
        [title]="confirmTitle()"
        [message]="confirmMessage()"
        [confirmLabel]="confirm()?.type === 'suspend' ? i18n.t('admin.users.suspend') : i18n.t('admin.users.revoke')"
        [cancelLabel]="i18n.t('common.cancel')"
        tone="danger"
        (confirmed)="runConfirmed()"
        (cancelled)="confirm.set(null)"
      />
    </section>
  `,
})
export class AdminUsersComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly repository = inject(AdminRepository);
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);

  protected readonly search = signal('');
  protected readonly role = signal<RoleFilter>('');
  protected readonly status = signal<StatusFilter>('');
  protected readonly from = signal('');
  protected readonly page = signal(1);
  protected readonly items = signal<AdminUser[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly detail = signal<AdminUserDetail | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly confirm = signal<ConfirmState | null>(null);
  protected readonly timeZone = 'Africa/Luanda';

  protected readonly confirmTitle = computed(() => {
    const state = this.confirm();
    if (!state) {
      return '';
    }
    return state.type === 'suspend'
      ? this.i18n.t('admin.users.confirmSuspendTitle')
      : this.i18n.t('admin.users.confirmRevokeTitle');
  });

  protected readonly confirmMessage = computed(() => {
    const state = this.confirm();
    if (!state) {
      return '';
    }
    const key =
      state.type === 'suspend'
        ? 'admin.users.confirmSuspendMessage'
        : 'admin.users.confirmRevokeMessage';
    return this.i18n.t(key, { name: state.user.displayName || state.user.email });
  });

  private requestSeq = 0;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    const seq = ++this.requestSeq;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.repository.users({
        q: this.search().trim() || undefined,
        role: this.role() || undefined,
        status: this.status() || undefined,
        from: this.from() || undefined,
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

  protected isSelf(user: AdminUser): boolean {
    return this.auth.host()?.id === user.id;
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    void this.load();
  }

  protected onRole(event: Event): void {
    this.role.set((event.target as HTMLSelectElement).value as RoleFilter);
    this.page.set(1);
    void this.load();
  }

  protected onStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as StatusFilter);
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

  protected async openDetail(user: AdminUser): Promise<void> {
    this.detail.set(null);
    this.detailLoading.set(true);
    try {
      this.detail.set(await this.repository.userDetail(user.id));
    } catch (error: unknown) {
      this.toasts.error(adminErrorMessage(error, this.i18n));
    } finally {
      this.detailLoading.set(false);
    }
  }

  protected closeDetail(): void {
    this.detail.set(null);
    this.detailLoading.set(false);
  }

  protected requestSuspend(user: AdminUser): void {
    // Defesa em profundidade: mesmo que o botão seja tocado, a própria conta nunca é suspensa.
    if (this.isSelf(user)) {
      return;
    }
    this.confirm.set({ type: 'suspend', user });
  }

  protected requestRevoke(user: AdminUser): void {
    this.confirm.set({ type: 'revoke', user });
  }

  protected async runConfirmed(): Promise<void> {
    const state = this.confirm();
    this.confirm.set(null);
    if (!state) {
      return;
    }
    try {
      if (state.type === 'suspend') {
        if (this.isSelf(state.user)) {
          return;
        }
        await this.repository.suspendUser(state.user.id);
        this.toasts.success(
          this.i18n.t('admin.users.suspendedToast', { name: this.displayName(state.user) }),
        );
      } else {
        await this.repository.revokeSessions(state.user.id);
        this.toasts.success(
          this.i18n.t('admin.users.revokedToast', { name: this.displayName(state.user) }),
        );
      }
      await this.load();
    } catch (error: unknown) {
      this.toasts.error(adminErrorMessage(error, this.i18n));
    }
  }

  protected async reactivate(user: AdminUser): Promise<void> {
    try {
      await this.repository.reactivateUser(user.id);
      this.toasts.success(
        this.i18n.t('admin.users.reactivatedToast', { name: this.displayName(user) }),
      );
      await this.load();
    } catch (error: unknown) {
      this.toasts.error(adminErrorMessage(error, this.i18n));
    }
  }

  protected roleLabel(role: AdminRole): TranslationKey {
    const keys: Record<AdminRole, TranslationKey> = {
      host: 'admin.users.role.host',
      manager: 'admin.users.role.manager',
      super_admin: 'admin.users.role.superAdmin',
    };
    return keys[role];
  }

  protected statusLabel(status: AdminUserStatus): TranslationKey {
    const keys: Record<AdminUserStatus, TranslationKey> = {
      active: 'admin.users.status.active',
      suspended: 'admin.users.status.suspended',
      deleted: 'admin.users.status.deleted',
    };
    return keys[status];
  }

  protected statusClass(status: AdminUserStatus): string {
    if (status === 'suspended' || status === 'deleted') {
      return 'border-coral/30 bg-coral/10 text-coral';
    }
    return 'border-mint/30 bg-mint/10 text-mint';
  }

  private displayName(user: AdminUser): string {
    return user.displayName || user.email;
  }
}
