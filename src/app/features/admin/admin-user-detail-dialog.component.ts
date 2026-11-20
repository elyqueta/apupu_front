import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ModalComponent } from '../../shared/components/modal.component';
import {
  AdminRole,
  AdminUser,
  AdminUserStatus,
} from './admin.models';

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

/** Detalhe só de leitura de uma conta. */
@Component({
  selector: 'app-admin-user-detail-dialog',
  imports: [ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('admin.users.detail.title')"
      (closed)="closed.emit()"
    >
      @if (user(); as user) {
        <dl class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
            <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {{ i18n.t('admin.users.detail.name') }}
            </dt>
            <dd class="mt-1 text-sm font-semibold text-ink">
              {{ user.displayName || i18n.t('common.notAvailable') }}
            </dd>
          </div>
          <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
            <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {{ i18n.t('admin.users.detail.email') }}
            </dt>
            <dd class="mt-1 break-all text-sm text-ink">{{ user.email }}</dd>
          </div>
          <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
            <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {{ i18n.t('admin.users.detail.role') }}
            </dt>
            <dd class="mt-1 text-sm text-ink">{{ i18n.t(roleLabel(user.role)) }}</dd>
          </div>
          <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
            <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {{ i18n.t('admin.users.detail.status') }}
            </dt>
            <dd class="mt-1 text-sm text-ink">{{ i18n.t(statusLabel(user.status)) }}</dd>
          </div>
          <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
            <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {{ i18n.t('admin.users.detail.created') }}
            </dt>
            <dd class="mt-1 text-sm text-ink">
              @if (user.createdAt) {
                {{ i18n.shortDate(user.createdAt, timeZone) }}
              } @else {
                {{ i18n.t('common.notAvailable') }}
              }
            </dd>
          </div>
          <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
            <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {{ i18n.t('admin.users.detail.events') }}
            </dt>
            <dd class="mt-1 text-sm text-ink">
              {{ i18n.t('admin.users.eventsCreated', { count: user.eventsCreated }) }}
            </dd>
          </div>
        </dl>
      }
    </app-modal>
  `,
})
export class AdminUserDetailDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly timeZone = 'Africa/Luanda';

  readonly open = input(false);
  readonly user = input<AdminUser | null>(null);
  readonly closed = output<void>();

  protected roleLabel(role: AdminRole): TranslationKey {
    return ROLE_KEYS[role];
  }

  protected statusLabel(status: AdminUserStatus): TranslationKey {
    return STATUS_KEYS[status];
  }
}
