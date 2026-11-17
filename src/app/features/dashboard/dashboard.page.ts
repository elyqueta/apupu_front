import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { toApiError } from '../../core/api/api-error';
import { TranslationKey } from '../../core/i18n/translations';
import { EventActivity, Guest, HostEvent } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { EVENT_TYPE_ICONS, ICONS } from '../../core/ui/icons';
import { ActivityPresenter } from '../../shared/services/activity.presenter';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { EventCardComponent } from '../../shared/components/event-card.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { TemplateArtworkComponent } from '../../shared/components/template-artwork.component';

interface ChartDay {
  label: string;
  value: number;
  height: number;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    FaIconComponent,
    AvatarComponent,
    EventCardComponent,
    StatCardComponent,
    StatusBadgeComponent,
    TemplateArtworkComponent,
  ],
  templateUrl: './dashboard.page.html',
})
export class DashboardPage {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly Math = Math;
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly activityPresenter = inject(ActivityPresenter);

  constructor() {
    // O painel agrega praticamente todos os domínios.
    this.store.load({
      dashboard: true,
      events: true,
      tasks: true,
      guests: true,
      activity: true,
    });
  }

  protected readonly stats = this.store.globalStats;
  protected readonly nextEvent = this.store.nextEvent;
  protected readonly taskProgress = this.store.taskProgress;
  protected readonly recentEvents = computed(() => this.store.recentEvents().slice(0, 4));
  protected readonly tasks = computed(() => this.store.tasks().slice(0, 4));
  protected readonly activity = computed(() => this.store.activityFeed().slice(0, 5));
  protected readonly pending = computed(() => {
    const event = this.nextEvent();
    if (event) {
      return this.store
        .pendingGuests()
        .filter((entry) => entry.guest.eventId === event.id)
        .slice(0, 6);
    }
    return this.store.pendingGuests().slice(0, 6);
  });

  protected readonly firstName = computed(() => this.store.profile().name.split(' ')[0]);
  protected readonly guestNames = computed(() =>
    this.store
      .guests()
      .filter((guest) => guest.status === 'confirmed')
      .slice(0, 4)
      .map((guest) => guest.name),
  );

  protected readonly countdown = computed(() => {
    const event = this.nextEvent();
    if (!event) {
      return { days: 0, hours: 0, minutes: 0 };
    }
    const distance = Math.max(0, new Date(event.startsAt).getTime() - Date.now());
    return {
      days: Math.floor(distance / 86_400_000),
      hours: Math.floor((distance % 86_400_000) / 3_600_000),
      minutes: Math.floor((distance % 3_600_000) / 60_000),
    };
  });

  protected readonly nextEventStats = computed(() => {
    const event = this.nextEvent();
    return event ? this.store.eventStats(event.id) : null;
  });

  protected readonly pendingCount = computed(() => {
    const event = this.nextEvent();
    if (event && this.nextEventStats()) {
      return this.nextEventStats()!.pending;
    }
    return this.stats().pending;
  });

  protected readonly week = computed<ChartDay[]>(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (6 - index));
      const end = new Date(day);
      end.setDate(end.getDate() + 1);
      const value = this.store.guests().filter((guest) => {
        if (!guest.respondedAt) {
          return false;
        }
        const at = new Date(guest.respondedAt).getTime();
        return at >= day.getTime() && at < end.getTime();
      }).length;
      return { date: day, value };
    });
    const max = Math.max(...days.map((day) => day.value), 1);
    return days.map((day) => ({
      label: this.i18n.weekdayShort(day.date, 'Africa/Luanda'),
      value: day.value,
      height: Math.max(4, Math.round((day.value / max) * 74)),
    }));
  });

  protected readonly typeIcon = computed<IconDefinition>(() => {
    const event = this.nextEvent();
    return event && event.type ? (EVENT_TYPE_ICONS[event.type] ?? ICONS['star']) : ICONS['star'];
  });

  protected readonly typeLabel = computed(() => {
    const event = this.nextEvent();
    return event ? this.i18n.t(`type.${event.type}` as TranslationKey) : '';
  });

  protected taskLabel(label: string): string {
    return label;
  }

  protected activityText(item: EventActivity, event: HostEvent): string {
    return this.activityPresenter.text(item, event.title);
  }

  protected activityIcon(kind: EventActivity['kind']): IconDefinition {
    return this.activityPresenter.icon(kind);
  }

  protected activityTone(kind: EventActivity['kind']): string {
    return this.activityPresenter.tone(kind);
  }

  protected async resendEmail(guest: Guest): Promise<void> {
    try {
      if (await this.store.sendReminder(guest.id)) {
        this.toasts.success(this.i18n.t('guests.resent', { name: guest.name }));
      }
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }

  protected openManagement(eventId: string): void {
    void this.router.navigate(['/eventos', eventId]);
  }

  protected async toggleTask(taskId: string): Promise<void> {
    try {
      await this.store.toggleTask(taskId);
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }
}
