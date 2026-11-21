import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ICONS } from '../../core/ui/icons';
import { ModalComponent } from '../../shared/components/modal.component';
import { AdminEventDetail, AdminEventStatus } from './admin.models';

const STATUS_KEYS: Record<AdminEventStatus, TranslationKey> = {
  active: 'admin.events.status.active',
  completed: 'admin.events.status.completed',
  cancelled: 'admin.events.status.cancelled',
};

/** Detalhe só de leitura de um evento, incluindo convidados e equipa. */
@Component({
  selector: 'app-admin-event-detail-dialog',
  imports: [FaIconComponent, ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      presentation="sheet"
      size="lg"
      [title]="i18n.t('admin.events.detail.title')"
      (closed)="closed.emit()"
    >
      @if (event(); as event) {
        <div class="space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-display text-xl font-semibold text-ink">{{ event.title }}</p>
              <p class="mt-1 text-sm text-muted">
                {{ i18n.t('admin.events.guests', { count: event.guestCount }) }}
              </p>
            </div>
            <span
              class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
              [class]="
                event.status === 'cancelled'
                  ? 'border-coral/30 bg-coral/10 text-coral'
                  : event.status === 'completed'
                    ? 'border-aqua/30 bg-aqua/10 text-aqua'
                    : 'border-mint/30 bg-mint/10 text-mint'
              "
            >
              <fa-icon [icon]="event.status === 'cancelled' ? icons['cancelled'] : icons['check']" class="text-[10px]" aria-hidden="true" />
              {{ i18n.t(statusLabel(event.status)) }}
            </span>
          </div>

          <dl class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
              <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
                {{ i18n.t('admin.events.detail.host') }}
              </dt>
              <dd class="mt-1 text-sm font-medium text-ink">
                {{ event.hostName || i18n.t('admin.events.hostUnknown') }}
              </dd>
              <dd class="text-xs text-muted">{{ event.hostEmail }}</dd>
            </div>
            <div class="rounded-2xl border border-line bg-surface-raised/60 p-3">
              <dt class="text-[10px] font-semibold uppercase tracking-widest text-muted">
                {{ i18n.t('admin.events.detail.dates') }}
              </dt>
              <dd class="mt-1 text-sm text-ink">
                @if (event.startsAt) {
                  {{ i18n.dateTime(event.startsAt, timeZone) }}
                } @else {
                  {{ i18n.t('common.notAvailable') }}
                }
              </dd>
              @if (event.endsAt) {
                <dd class="text-xs text-muted">{{ i18n.dateTime(event.endsAt, timeZone) }}</dd>
              }
            </div>
          </dl>

          @if (event.cancellationReason) {
            <div class="rounded-2xl border border-coral/25 bg-coral/10 p-3">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-coral">
                {{ i18n.t('admin.events.detail.reason') }}
              </p>
              <p class="mt-1 text-sm text-ink">{{ event.cancellationReason }}</p>
            </div>
          }

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 class="text-sm font-semibold text-ink">
                {{ i18n.t('admin.events.detail.guests') }}
              </h3>
              @if (event.guests.length) {
                <ul class="mt-2 space-y-1.5" data-testid="admin-event-detail-guests">
                  @for (guest of event.guests.slice(0, 10); track guest.id) {
                    <li
                      class="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                    >
                      <span class="truncate text-ink">{{ guest.name }}</span>
                      <span class="text-[10px] uppercase tracking-wider text-muted">
                        {{ guest.rsvpStatus }}
                      </span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="mt-2 text-sm text-muted">{{ i18n.t('admin.events.detail.noGuests') }}</p>
              }
            </div>
            <div>
              <h3 class="text-sm font-semibold text-ink">
                {{ i18n.t('admin.events.detail.team') }}
              </h3>
              @if (event.teams.length) {
                <ul class="mt-2 space-y-1.5" data-testid="admin-event-detail-teams">
                  @for (team of event.teams; track team.id) {
                    <li
                      class="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                    >
                      <span class="truncate text-ink">{{ team.name }}</span>
                      <span class="text-[10px] uppercase tracking-wider text-muted">
                        {{ i18n.t('admin.events.guests', { count: team.memberCount }) }}
                      </span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="mt-2 text-sm text-muted">{{ i18n.t('admin.events.detail.noTeam') }}</p>
              }
            </div>
          </div>
        </div>
      }
    </app-modal>
  `,
})
export class AdminEventDetailDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly timeZone = 'Africa/Luanda';

  readonly open = input(false);
  readonly event = input<AdminEventDetail | null>(null);
  readonly closed = output<void>();

  protected statusLabel(status: AdminEventStatus): TranslationKey {
    return STATUS_KEYS[status];
  }
}
