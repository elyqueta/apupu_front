import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { Pagination } from '../../core/api/api.models';
import {
  EventActivity,
  EventManager,
  Guest,
  RsvpStatus,
  WorkspaceTask,
} from '../../core/models/models';
import { ShareService } from '../../core/services/share.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { EVENT_TYPE_ICONS, ICONS } from '../../core/ui/icons';
import { ActivityPresenter } from '../../shared/services/activity.presenter';
import { toApiError } from '../../core/api/api-error';
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
  ],
  templateUrl: './event-detail.page.html',
})
export class EventDetailPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toasts = inject(ToastService);
  private readonly activityPresenter = inject(ActivityPresenter);
  private readonly share = inject(ShareService);

  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly eventId = input.required<string>();

  protected readonly tab = signal<DetailTab>('overview');
  protected readonly guestSearch = signal('');
  protected readonly guestFilter = signal<GuestFilter>('all');
  protected readonly guestDialogOpen = signal(false);
  protected readonly cancelOpen = signal(false);
  protected readonly managersLoading = signal(false);
  protected readonly managerBusyId = signal<string | null>(null);
  protected readonly taskBusyId = signal<string | null>(null);
  protected readonly creatingTask = signal(false);
  protected readonly activityItems = signal<EventActivity[]>([]);
  protected readonly activityPagination = signal<Pagination | null>(null);
  protected readonly activityLoading = signal(false);
  protected readonly coverUploading = signal(false);
  protected readonly coverProgress = signal(0);
  private coverUploadHandle: { cancel: () => void } | null = null;

  protected readonly event = computed(() => this.store.eventById(this.eventId()));
  protected readonly stats = computed(() => this.store.eventStats(this.eventId()));
  protected readonly guests = computed(() => this.store.guestsFor(this.eventId()));
  protected readonly activity = this.activityItems.asReadonly();
  protected readonly tasks = computed(() => this.store.tasksFor(this.eventId()));
  protected readonly tasksDone = computed(() => this.tasks().filter((task) => task.done).length);
  protected readonly isManagement = computed(
    () => this.store.activeManagementEventId() === this.eventId(),
  );
  protected readonly accessRole = computed(() => this.store.accessRoleFor(this.eventId()));
  protected readonly isHost = computed(() => this.accessRole() === 'host');
  protected readonly managers = computed(() => this.store.managersFor(this.eventId()));

  protected readonly typeLabel = computed(() => {
    const event = this.event();
    return event?.type ? this.i18n.t(`type.${event.type}` as TranslationKey) : '';
  });

  protected readonly typeIcon = computed<IconDefinition>(() => {
    const event = this.event();
    return event?.type ? (EVENT_TYPE_ICONS[event.type] ?? ICONS['star']) : ICONS['star'];
  });

  protected readonly templateName = computed(() => {
    const event = this.event();
    return event?.templateId
      ? this.store.templates().find((template) => template.id === event.templateId)?.name ?? ''
      : '';
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
        bar: 'fill-brand',
        dot: 'bg-mint',
      },
      {
        key: 'pending' as const,
        value: stats.pending,
        percent: Math.round((stats.pending / total) * 100),
        bar: 'fill-brand',
        dot: 'bg-amber',
      },
      {
        key: 'declined' as const,
        value: stats.declined,
        percent: Math.round((stats.declined / total) * 100),
        bar: 'fill-brand',
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

  protected readonly managerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  protected readonly taskForm = this.fb.group({
    label: ['', [Validators.required, Validators.maxLength(200)]],
    managerId: [''],
  });

  protected readonly coverForm = this.fb.group({
    url: ['', [Validators.pattern(/^https:\/\/.+/), Validators.maxLength(500)]],
  });

  constructor() {
    this.store.load({
      events: true,
      guests: true,
      activity: true,
      tasks: true,
      templates: true,
    });
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
    effect(() => {
      if (this.tab() === 'settings' && this.isHost()) {
        untracked(() => void this.refreshManagers());
      }
    });
    effect(() => {
      if (!this.isHost() || this.managers().length > 0) {
        return;
      }
      untracked(() => void this.refreshManagers());
    });
    effect(() => {
      const event = this.event();
      untracked(() => {
        void this.loadActivity(1);
        this.coverForm.reset({ url: event?.coverUrl ?? '' });
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

  protected activityText(item: EventActivity): string {
    return this.activityPresenter.text(item, this.event()?.title ?? '');
  }

  protected activityIcon(kind: EventActivity['kind']): IconDefinition {
    return this.activityPresenter.icon(kind);
  }

  protected activityTone(kind: EventActivity['kind']): string {
    return this.activityPresenter.tone(kind);
  }

  protected async loadActivity(page = 1): Promise<void> {
    const eventId = this.eventId();
    if (!eventId) {
      return;
    }
    this.activityLoading.set(true);
    try {
      const result = await this.store.listEventActivity(eventId, page, 8);
      this.activityItems.set(result.items);
      this.activityPagination.set(result.pagination);
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.activityLoading.set(false);
    }
  }

  protected goToActivityPage(page: number): void {
    const pagination = this.activityPagination();
    if (!pagination || page < 1 || page > pagination.total_pages || page === pagination.page) {
      return;
    }
    void this.loadActivity(page);
  }

  protected async createTask(): Promise<void> {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }
    const value = this.taskForm.getRawValue();
    this.creatingTask.set(true);
    try {
      await this.store.createTask(value.label.trim(), this.eventId(), value.managerId || null);
      this.taskForm.reset({ label: '', managerId: '' });
      this.toasts.success(this.i18n.t('eventDetail.taskCreated'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.creatingTask.set(false);
    }
  }

  protected async removeTask(task: WorkspaceTask): Promise<void> {
    if (this.taskBusyId()) {
      return;
    }
    this.taskBusyId.set(task.id);
    try {
      await this.store.removeTask(task.id);
      this.toasts.success(this.i18n.t('eventDetail.taskRemoved'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.taskBusyId.set(null);
    }
  }

  protected async setCoverUrl(): Promise<void> {
    if (this.coverForm.invalid) {
      this.coverForm.markAllAsTouched();
      return;
    }
    const url = this.coverForm.controls.url.value.trim();
    if (!url) {
      return;
    }
    try {
      await this.store.setEventCoverUrl(this.eventId(), url);
      this.toasts.success(this.i18n.t('eventDetail.coverSaved'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }

  protected onCoverFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      void this.uploadCover(file);
    }
  }

  protected async uploadCover(file: File): Promise<void> {
    if (this.coverUploading()) {
      return;
    }
    this.coverUploading.set(true);
    this.coverProgress.set(0);
    const handle = this.store.uploadEventCover(this.eventId(), file, (percent) =>
      this.coverProgress.set(percent),
    );
    this.coverUploadHandle = handle;
    try {
      await handle.promise;
      this.coverProgress.set(100);
      this.toasts.success(this.i18n.t('eventDetail.coverUploaded'));
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.toasts.error(toApiError(error).message);
      }
    } finally {
      this.coverUploading.set(false);
      this.coverUploadHandle = null;
      this.coverProgress.set(0);
    }
  }

  protected cancelCoverUpload(): void {
    this.coverUploadHandle?.cancel();
    this.coverUploading.set(false);
    this.coverProgress.set(0);
  }

  protected async removeCover(): Promise<void> {
    try {
      await this.store.removeEventCover(this.eventId());
      this.coverForm.reset({ url: '' });
      this.toasts.success(this.i18n.t('eventDetail.coverRemoved'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }

  protected taskLabel(task: WorkspaceTask): string {
    return task.label;
  }

  protected async resendManagementLink(): Promise<void> {
    try {
      const status = await this.store.resendManageLink(this.eventId());
      if (status === 'queued') {
        this.toasts.success('O link de gestão ficou em fila para envio para o email do anfitrião.');
      } else {
        this.toasts.error('O evento mantém-se disponível, mas não foi possível enfileirar o link.');
      }
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }

  protected async refreshManagers(): Promise<void> {
    if (this.managersLoading()) {
      return;
    }
    this.managersLoading.set(true);
    try {
      await this.store.loadManagers(this.eventId());
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.managersLoading.set(false);
    }
  }

  protected async addManager(): Promise<void> {
    if (this.managerForm.invalid) {
      this.managerForm.markAllAsTouched();
      return;
    }
    const email = this.managerForm.controls.email.value.trim();
    try {
      const result = await this.store.addManager(this.eventId(), email);
      this.managerForm.reset({ email: '' });
      if (result.emailStatus === 'queued') {
        this.toasts.success(this.i18n.t('eventDetail.managerAdded', { email }));
      } else {
        this.toasts.error(this.i18n.t('eventDetail.managerAddedNoEmail', { email }));
      }
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }

  protected async removeManager(manager: EventManager): Promise<void> {
    this.managerBusyId.set(manager.id);
    try {
      await this.store.removeManager(this.eventId(), manager.id);
      this.toasts.success(this.i18n.t('eventDetail.managerRemoved', { email: manager.email }));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.managerBusyId.set(null);
    }
  }

  protected async resendManagerInvite(manager: EventManager): Promise<void> {
    this.managerBusyId.set(manager.id);
    try {
      const result = await this.store.resendManagerInvite(this.eventId(), manager.id);
      if (result.emailStatus === 'queued') {
        this.toasts.success(this.i18n.t('eventDetail.managerResent', { email: manager.email }));
      } else {
        this.toasts.error(this.i18n.t('eventDetail.managerResentFailed', { email: manager.email }));
      }
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.managerBusyId.set(null);
    }
  }

  protected async publish(): Promise<void> {
    try {
      await this.store.updateEvent(this.eventId(), { status: 'published' });
      this.toasts.success(this.i18n.t('eventDetail.published'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }

  protected async saveSettings(): Promise<void> {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }
    try {
      await this.store.updateEvent(this.eventId(), this.settingsForm.getRawValue());
      this.toasts.success(this.i18n.t('eventDetail.changesSaved'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }

  protected async cancelEvent(): Promise<void> {
    try {
      await this.store.updateEvent(this.eventId(), { status: 'cancelled' });
      this.cancelOpen.set(false);
      this.toasts.success(this.i18n.t('eventDetail.cancelled'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }

  protected async resend(guest: Guest): Promise<void> {
    try {
      if (await this.store.sendReminder(guest.id)) {
        this.toasts.success(this.i18n.t('eventDetail.resendDone', { name: guest.name }));
      }
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }

  /**
   * Abre o WhatsApp (`wa.me`) com a mensagem de reencaminhamento do convite.
   *
   * O link individual vem de `invitation_url`; se o convite estiver
   * revogado a API devolve `null` e a mensagem segue sem link.
   */
  protected forwardWhatsApp(guest: Guest): void {
    const key = guest.invitationUrl
      ? 'guests.whatsappMessageWithLink'
      : 'guests.whatsappMessage';
    const text = this.i18n.t(key, {
      name: guest.name,
      event: this.event()?.title ?? '',
      url: guest.invitationUrl ?? '',
    });
    const url = this.share.whatsappUrl(guest.phone, text);
    if (url) {
      this.share.openExternal(url);
    }
  }

  protected async removeGuest(guest: Guest): Promise<void> {
    try {
      await this.store.removeGuest(guest.id);
      this.toasts.success(this.i18n.t('guests.removed'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }

  protected async toggleTask(taskId: string): Promise<void> {
    try {
      await this.store.toggleTask(taskId);
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }
}
