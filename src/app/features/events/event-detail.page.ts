import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { EventActivity, Guest, RsvpStatus, WorkspaceTask } from '../../core/models/models';
import { ShareService } from '../../core/services/share.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { EVENT_TYPE_ICONS, ICONS } from '../../core/ui/icons';
import { ActivityPresenter } from '../../shared/services/activity.presenter';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { GuestDialogComponent } from '../../shared/components/guest-dialog.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { TemplateArtworkComponent } from '../../shared/components/template-artwork.component';

type DetailTab = 'overview' | 'guests' | 'settings';
type GuestFilter = 'all' | RsvpStatus;

@Component({
  selector: 'app-event-detail-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FaIconComponent,
    AvatarComponent,
    ConfirmDialogComponent,
    GuestDialogComponent,
    StatusBadgeComponent,
    TemplateArtworkComponent,
  ],  templateUrl: './event-detail.page.html',
})
export class EventDetailPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toasts = inject(ToastService);
  private readonly share = inject(ShareService);
  private readonly router = inject(Router);
  private readonly activityPresenter = inject(ActivityPresenter);

  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly eventId = input.required<string>();

  protected readonly tab = signal<DetailTab>('overview');
  protected readonly guestSearch = signal('');
  protected readonly guestFilter = signal<GuestFilter>('all');
  protected readonly guestDialogOpen = signal(false);
  protected readonly cancelOpen = signal(false);

  protected readonly event = computed(() => this.store.eventById(this.eventId()));
  protected readonly stats = computed(() => this.store.eventStats(this.eventId()));
  protected readonly guests = computed(() => this.store.guestsFor(this.eventId()));
  protected readonly activity = computed(() => this.store.activityFor(this.eventId()));
  protected readonly tasks = computed(() => this.store.tasksFor(this.eventId()));
  protected readonly isManagement = computed(
    () => this.store.activeManagementEventId() === this.eventId(),
  );

  protected readonly typeLabel = computed(() => {
    const event = this.event();
    return event ? this.i18n.t(`type.${event.type}` as TranslationKey) : '';
  });

  protected readonly typeIcon = computed<IconDefinition>(() => {
    const event = this.event();
    return event ? (EVENT_TYPE_ICONS[event.type] ?? ICONS['star']) : ICONS['star'];
  });

  protected readonly templateName = computed(() => {
    const event = this.event();
    return event ? this.i18n.t(`template.${event.templateId}.name` as TranslationKey) : '';
  });

  protected readonly respondedCount = computed(
    () => this.stats().confirmed + this.stats().declined,
  );

  protected readonly deadlinePassed = computed(() => {
    const event = this.event();
    if (!event?.rsvpDeadline) {
      return false;
    }
    return Date.now() > new Date(event.rsvpDeadline).getTime();
  });

  protected readonly filteredGuests = computed<Guest[]>(() => {
    const term = this.guestSearch().trim().toLocaleLowerCase(this.i18n.locale());
    const filter = this.guestFilter();
    return this.guests()
      .filter((guest) => filter === 'all' || guest.status === filter)
      .filter((guest) => {
        if (!term) {
          return true;
        }
        return `${guest.name} ${guest.email}`.toLocaleLowerCase(this.i18n.locale()).includes(term);
      });
  });

  protected readonly guestFilters: Array<{ id: GuestFilter; labelKey: TranslationKey }> = [
    { id: 'all', labelKey: 'eventDetail.filterAll' },
    { id: 'confirmed', labelKey: 'status.confirmed' },
    { id: 'pending', labelKey: 'status.pending' },
    { id: 'declined', labelKey: 'status.declined' },
  ];

  protected readonly breakdown = computed(() => {
    const stats = this.stats();
    const total = Math.max(stats.total, 1);
    return [
      {
        key: 'confirmed' as const,
        value: stats.confirmed,
        percent: Math.round((stats.confirmed / total) * 100),
        bar: 'fill-mint',
        dot: 'bg-mint',
      },
      {
        key: 'pending' as const,
        value: stats.pending,
        percent: Math.round((stats.pending / total) * 100),
        bar: 'fill-amber',
        dot: 'bg-amber',
      },
      {
        key: 'declined' as const,
        value: stats.declined,
        percent: Math.round((stats.declined / total) * 100),
        bar: 'fill-coral',
        dot: 'bg-coral',
      },
    ];
  });

  protected readonly settingsForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    venue: ['', [Validators.required, Validators.maxLength(120)]],
    city: ['', [Validators.required, Validators.maxLength(80)]],
    message: ['', [Validators.required, Validators.maxLength(1200)]],
    rules: ['', [Validators.maxLength(800)]],
    dressCode: ['', [Validators.maxLength(160)]],
  });

  constructor() {
    effect(() => {
      const event = this.event();
      if (!event) {
        return;
      }
      this.settingsForm.reset({
        title: event.title,
        venue: event.venue,
        city: event.city,
        message: event.message,
        rules: event.rules,
        dressCode: event.dressCode,
      });
    });
  }

  protected setTab(tab: DetailTab): void {
    this.tab.set(tab);
  }

  protected countFor(filter: GuestFilter): number {
    return filter === 'all'
      ? this.guests().length
      : this.guests().filter((guest) => guest.status === filter).length;
  }

  protected templateLabel(key: string): string {
    return this.i18n.t(key as TranslationKey);
  }

  protected activityText(item: EventActivity): string {
    return this.activityPresenter.text(item, this.event()?.title ?? '');
  }

  protected activityIcon(kind: EventActivity['kind']): IconDefinition {
    return this.activityPresenter.icon(kind);
  }

  protected activityTone(kind: EventActivity['kind']): string {
    return this.activityPresenter.tone(kind);
  }

  protected taskLabel(task: WorkspaceTask): string {
    return this.i18n.t(task.labelKey as TranslationKey);
  }

  protected async copyInvitation(): Promise<void> {
    const event = this.event();
    if (!event) {
      return;
    }
    const copied = await this.share.copy(
      this.share.absoluteUrl(`/i/${event.invitationToken}`),
    );
    if (copied) {
      this.toasts.success(this.i18n.t('common.copied'));
    } else {
      this.toasts.error(this.i18n.t('common.copyError'));
    }
  }

  protected openManagement(): void {
    this.store.setActiveManagement(this.eventId());
    void this.router.navigate(['/gestao/evento']);
  }

  protected endManagement(): void {
    this.store.setActiveManagement(null);
    this.toasts.info(this.i18n.t('settings.managementEnded'));
  }

  protected publish(): void {
    this.store.publishEvent(this.eventId());
    this.toasts.success(this.i18n.t('eventDetail.published'));
  }

  protected saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }
    this.store.updateEvent(this.eventId(), this.settingsForm.getRawValue());
    this.toasts.success(this.i18n.t('eventDetail.changesSaved'));
  }

  protected cancelEvent(): void {
    this.store.updateEvent(this.eventId(), { status: 'cancelled' });
    this.cancelOpen.set(false);
    this.toasts.success(this.i18n.t('eventDetail.cancelled'));
  }

  protected setRsvp(guest: Guest, status: RsvpStatus): void {
    if (this.store.updateRsvp(guest.id, status)) {
      this.toasts.success(this.i18n.t('invitation.responseRecorded'));
    }
  }

  protected resend(guest: Guest): void {
    if (this.store.sendReminder(guest.id)) {
      this.toasts.success(this.i18n.t('eventDetail.resendDone', { name: guest.name }));
    }
  }

  protected removeGuest(guest: Guest): void {
    this.store.removeGuest(guest.id);
    this.toasts.success(this.i18n.t('guests.removed'));
  }

  protected toggleTask(taskId: string): void {
    this.store.toggleTask(taskId);
  }
}
