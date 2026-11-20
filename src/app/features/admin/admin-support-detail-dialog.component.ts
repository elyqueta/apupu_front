import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ModalComponent } from '../../shared/components/modal.component';
import { AdminSupportMessage, SupportMessageStatus } from './admin.models';

const STATUS_KEYS: Record<SupportMessageStatus, TranslationKey> = {
  open: 'admin.support.status.open',
  resolved: 'admin.support.status.resolved',
};

/** Detalhe só de leitura de uma mensagem de apoio. */
@Component({
  selector: 'app-admin-support-detail-dialog',
  imports: [ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('admin.support.detail.title')"
      size="lg"
      (closed)="closed.emit()"
    >
      @if (message(); as message) {
        <div data-testid="admin-support-detail" class="space-y-4">
          <dl class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
              <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
                {{ i18n.t('admin.support.detail.name') }}
              </dt>
              <dd class="mt-1 text-sm font-semibold text-ink">{{ message.name }}</dd>
            </div>
            <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
              <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
                {{ i18n.t('admin.support.detail.email') }}
              </dt>
              <dd class="mt-1 break-all text-sm text-ink">{{ message.email }}</dd>
            </div>
          </dl>

          <dl class="rounded-2xl border border-line bg-surface-raised/60 p-3">
            <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {{ i18n.t('admin.support.detail.message') }}
            </dt>
            <dd class="mt-2 whitespace-pre-line break-words text-sm leading-6 text-ink">
              {{ message.message }}
            </dd>
          </dl>

          <dl class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
              <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
                {{ i18n.t('admin.support.detail.status') }}
              </dt>
              <dd class="mt-1">
                <span
                  class="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  [class]="statusClass(message.status)"
                >
                  {{ i18n.t(statusLabel(message.status)) }}
                </span>
              </dd>
            </div>
            <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
              <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
                {{ i18n.t('admin.support.detail.created') }}
              </dt>
              <dd class="mt-1 text-sm text-ink">
                @if (message.createdAt) {
                  {{ i18n.dateTime(message.createdAt, timeZone) }}
                } @else {
                  {{ i18n.t('common.notAvailable') }}
                }
              </dd>
            </div>
            <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
              <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
                {{ i18n.t('admin.support.detail.resolved') }}
              </dt>
              <dd class="mt-1 text-sm text-ink">
                @if (message.resolvedAt) {
                  {{ i18n.dateTime(message.resolvedAt, timeZone) }}
                } @else {
                  {{ i18n.t('common.notAvailable') }}
                }
              </dd>
            </div>
          </dl>
        </div>
      }
    </app-modal>
  `,
})
export class AdminSupportDetailDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly timeZone = 'Africa/Luanda';

  readonly open = input(false);
  readonly message = input<AdminSupportMessage | null>(null);
  readonly closed = output<void>();

  protected statusLabel(status: SupportMessageStatus): TranslationKey {
    return STATUS_KEYS[status];
  }

  protected statusClass(status: SupportMessageStatus): string {
    return status === 'resolved'
      ? 'border-mint/30 bg-mint/10 text-mint'
      : 'border-amber/30 bg-amber/10 text-amber';
  }
}
