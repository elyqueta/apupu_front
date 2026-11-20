import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { InvitationEventView } from '../invitation.models';

/** Cartões pequenos com a informação essencial do convite. */
@Component({
  selector: 'app-invitation-key-info',
  imports: [FaIconComponent, AvatarComponent],
  template: `
    <section class="flex flex-col gap-3">
      <h2 class="text-sm font-semibold uppercase tracking-[0.16em] text-brand-strong">
        {{ i18n.t('invitation.detailsTitle') }}
      </h2>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          data-testid="invitation-host-card"
          class="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          (click)="openHost.emit()"
        >
          <app-avatar
            [name]="event().hostName"
            [imageUrl]="event().hostAvatarUrl"
            size="md"
          />
          <span class="min-w-0">
            <span class="block text-xs font-medium text-muted">{{ i18n.t('invitation.who') }}</span>
            <span class="block truncate text-sm font-semibold text-ink">{{ event().hostName }}</span>
          </span>
        </button>

        <div class="min-h-20 rounded-2xl border border-line bg-surface p-3">
          <p class="flex items-center gap-2 text-xs font-medium text-muted">
            <fa-icon [icon]="icons['calendar']" aria-hidden="true" />
            {{ i18n.t('invitation.when') }}
          </p>
          <p class="mt-1 text-sm font-semibold text-ink">{{ i18n.shortDate(event().startsAt, event().timezone) }}</p>
          <p class="mt-0.5 text-xs text-muted">
            {{ i18n.time(event().startsAt, event().timezone) }}
            @if (event().endsAt; as endsAt) {
              <span> · {{ i18n.t('invitation.endsAt') }} {{ i18n.time(endsAt, event().timezone) }}</span>
            }
          </p>
        </div>

        @if (hasLocation()) {
          <button
            type="button"
            data-testid="invitation-location-card"
            class="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-aqua/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/60"
            (click)="openLocation.emit()"
          >
            <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-aqua/10 text-aqua">
              <fa-icon [icon]="icons['location']" aria-hidden="true" />
            </span>
            <span class="min-w-0">
              <span class="block text-xs font-medium text-muted">{{ i18n.t('invitation.where') }}</span>
              <span class="block truncate text-sm font-semibold text-ink">{{ locationLabel() }}</span>
            </span>
          </button>
        }

        <div
          class="min-h-20 rounded-2xl border p-3"
          [class]="deadlineTone() === 'danger'
            ? 'border-coral/30 bg-coral/10'
            : deadlineTone() === 'warning'
              ? 'border-amber/30 bg-amber/10'
              : 'border-line bg-surface'"
        >
          <p class="flex items-center gap-2 text-xs font-medium text-muted">
            <fa-icon [icon]="icons['clock']" aria-hidden="true" />
            {{ i18n.t('invitation.deadlineLabel') }}
          </p>
          <p class="mt-1 text-sm font-semibold text-ink">{{ deadlineValue() }}</p>
          @if (deadlineNote()) {
            <p class="mt-0.5 text-xs text-muted">{{ deadlineNote() }}</p>
          }
        </div>
      </div>
    </section>
  `,
})
export class InvitationKeyInfoComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly event = input.required<InvitationEventView>();
  readonly deadlinePassed = input(false);

  readonly openHost = output<void>();
  readonly openLocation = output<void>();

  protected readonly hasLocation = computed(
    () => Boolean(this.event().venue || this.event().address || this.event().onlineLink),
  );

  protected readonly locationLabel = computed(() => {
    const event = this.event();
    return event.venue || event.address || this.i18n.t('invitation.onlineEvent');
  });

  protected readonly deadlineTone = computed<'danger' | 'warning' | 'neutral'>(() => {
    const event = this.event();
    if (this.deadlinePassed() || event.status === 'completed' || event.status === 'cancelled') {
      return 'danger';
    }
    const deadline = event.rsvpDeadline;
    if (deadline && new Date(deadline).getTime() - Date.now() <= 86_400_000) {
      return 'warning';
    }
    return 'neutral';
  });

  protected readonly deadlineValue = computed(() => {
    const deadline = this.event().rsvpDeadline;
    if (!deadline) {
      return this.i18n.t('invitation.noDeadline');
    }
    return this.i18n.dateTime(deadline, this.event().timezone);
  });

  protected readonly deadlineNote = computed(() => {
    if (this.deadlinePassed() || this.event().status === 'completed') {
      return this.i18n.t('invitation.deadlineEnded');
    }
    const deadline = this.event().rsvpDeadline;
    if (deadline && new Date(deadline).getTime() - Date.now() <= 86_400_000) {
      return this.i18n.t('invitation.deadlineSoon');
    }
    return '';
  });
}
