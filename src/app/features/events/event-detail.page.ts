import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  PLATFORM_ID,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ApiClient } from '../../core/api/api-client';
import { Pagination } from '../../core/api/api.models';
import { EventsRepository } from '../../core/data/events.repository';
import { GuestListEntry, GuestsQuery } from '../../core/data/guests.repository';
import { TeamsRepository } from '../../core/data/teams.repository';
import {
  EventExportDocument,
  ReportExportFormat,
  ReportsRepository,
} from '../../core/data/reports.repository';
import {
  EventActivity,
  EventManager,
  EventPermissions,
  eventPermissionsFor,
  Guest,
  ManagerCreationResult,
  ManagerInviteResult,
  Team,
  WorkspaceTask,
} from '../../core/models/models';
import { ShareService } from '../../core/services/share.service';
import { DownloadService } from '../../core/services/download.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { EVENT_TYPE_ICONS, ICONS } from '../../core/ui/icons';
import { ActivityPresenter } from '../../shared/services/activity.presenter';
import { toApiError } from '../../core/api/api-error';
import { ActionMenuItem } from '../../shared/components/action-menu.component';
import { EventSectionItem, EventSectionShellComponent } from '../../shared/components/event-section-shell.component';
import { GuestDialogComponent } from '../../shared/components/guest-dialog.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import type {
  PersonMetaItem,
  PersonPrimaryAction,
} from '../../shared/components/person-card.component';
import { TaskFormDialogComponent } from '../../shared/components/task-form-dialog.component';
import { TeamManagerDialogComponent } from '../team/team-manager-dialog.component';
import {
  eventTabQuery,
  EVENT_TABS,
  EventTab,
  GuestFilter,
  parseEventTab,
} from './detail/detail.models';
import { MessagesInboxComponent } from '../messages/messages-inbox.component';
import { EventActivitySectionComponent } from './detail/event-activity-section.component';
import { EventGuestsSectionComponent } from './detail/event-guests-section.component';
import { InvitationLinkDialogComponent } from './detail/invitation-link-dialog.component';
import { EventManagersSectionComponent } from './detail/event-managers-section.component';
import { EventSummaryComponent } from './detail/event-summary.component';
import { EventTasksSectionComponent } from './detail/event-tasks-section.component';
import { EventTeamsSectionComponent } from './detail/event-teams-section.component';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return toIsoDate(new Date());
}

/** Data `YYYY-MM-DD` some dias depois da data indicada. */
function isoDatePlusDays(value: string, days: number): string {
  const base = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    return todayIso();
  }
  base.setUTCDate(base.getUTCDate() + days);
  return toIsoDate(base);
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return toIsoDate(date);
}

@Component({
  selector: 'app-event-detail-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FaIconComponent,
    EventSectionShellComponent,
    MessagesInboxComponent,
    GuestDialogComponent,
    ModalComponent,
    SkeletonComponent,
    TaskFormDialogComponent,
    TeamManagerDialogComponent,
    EventActivitySectionComponent,
    EventGuestsSectionComponent,
    InvitationLinkDialogComponent,
    EventManagersSectionComponent,
    EventSummaryComponent,
    EventTasksSectionComponent,
    EventTeamsSectionComponent,
  ],
  templateUrl: './event-detail.page.html',
})
export class EventDetailPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toasts = inject(ToastService);
  private readonly activityPresenter = inject(ActivityPresenter);
  private readonly share = inject(ShareService);
  private readonly api = inject(ApiClient);
  private readonly reports = inject(ReportsRepository);
  private readonly eventsRepository = inject(EventsRepository);
  private readonly teamsRepository = inject(TeamsRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly downloads = inject(DownloadService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly eventId = input.required<string>();

  protected readonly tab = signal<EventTab>('resumo');
  protected readonly guestSearch = signal('');
  protected readonly guestFilter = signal<GuestFilter>('all');
  protected readonly guestPage = signal(1);
  protected readonly guestItems = signal<GuestListEntry[]>([]);
  protected readonly guestPagination = signal<Pagination | null>(null);
  protected readonly guestListLoading = signal(false);
  protected readonly guestListLoaded = signal(false);
  private guestRequestSeq = 0;
  private guestDebounce: ReturnType<typeof setTimeout> | null = null;
  protected readonly guestDialogOpen = signal(false);
  protected readonly guestEditTarget = signal<Guest | null>(null);
  /** Diálogo de validade do link individual do convite. */
  protected readonly linkDialogOpen = signal(false);
  protected readonly linkGuest = signal<Guest | null>(null);
  protected readonly linkSaving = signal(false);
  protected readonly linkError = signal('');
  protected readonly exportOpen = signal(false);
  protected readonly exporting = signal<string | null>(null);
  protected readonly periodFrom = signal(isoDaysAgo(29));
  protected readonly periodTo = signal(todayIso());
  private periodInitialised = false;
  protected readonly cancelOpen = signal(false);
  protected readonly managersLoading = signal(false);
  protected readonly managerBusyId = signal<string | null>(null);
  protected readonly teams = signal<Team[]>([]);
  protected readonly teamsLoading = signal(false);
  /** Modal partilhado com `/equipas` para criar equipa + gestor (Bloco 2). */
  protected readonly managerDialogOpen = signal(false);
  protected readonly credentials = signal<ManagerCreationResult | null>(null);
  protected readonly credentialsOpen = signal(false);
  protected readonly editModalOpen = signal(false);
  protected readonly coverModalOpen = signal(false);
  protected readonly taskDialogOpen = signal(false);
  protected readonly onlyMine = signal(false);
  protected readonly taskBusyId = signal<string | null>(null);
  protected readonly creatingTask = signal(false);
  protected readonly activityItems = signal<EventActivity[]>([]);
  protected readonly activityPagination = signal<Pagination | null>(null);
  protected readonly activityLoading = signal(false);
  protected readonly activityBusyId = signal<string | null>(null);
  protected readonly coverUploading = signal(false);
  protected readonly coverProgress = signal(0);
  private coverUploadHandle: { cancel: () => void } | null = null;

  protected readonly events = this.store.events;
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
  protected readonly permissions = computed<EventPermissions>(() =>
    eventPermissionsFor(this.accessRole()),
  );

  /** Evento cancelado: todas as escritas ficam bloqueadas na interface. */
  protected readonly eventCancelled = computed(() => this.event()?.status === 'cancelled');

  protected readonly effectivePermissions = computed<EventPermissions>(() => {
    const permissions = this.permissions();
    if (!this.eventCancelled()) return permissions;
    return {
      ...permissions,
      canEditEvent: false,
      canManageGuests: false,
      canManageTeams: false,
      canManageManagers: false,
      canCancelEvent: false,
      canChangeEventStatus: false,
      canEditExistingGuests: false,
      canDeleteActivity: false,
      canManageTasks: false,
      canResendManageLink: false,
    };
  });

  protected readonly eventBadges = computed<string[]>(() => {
    const badges: string[] = [];
    if (this.isManagement()) {
      badges.push(this.i18n.t('settings.active'));
    }
    if (!this.isHost()) {
      badges.push(this.i18n.t('eventDetail.roleManager'));
    }
    return badges;
  });

  /** Secções do rail, derivadas da lista partilhada de separadores. */
  protected readonly sections = computed<EventSectionItem[]>(() =>
    EVENT_TABS.map((definition) => ({
      id: definition.id,
      label: this.i18n.t(definition.labelKey),
      icon: ICONS[definition.icon],
      count: definition.id === 'convidados' ? this.stats().total : null,
    })),
  );

  /** Ações da secção, agora no rail em vez do cabeçalho. */
  protected readonly sectionActions = computed<ActionMenuItem[]>(() => {
    const items: ActionMenuItem[] = [];
    const permissions = this.effectivePermissions();
    const event = this.event();

    if (permissions.canEditEvent) {
      items.push({
        id: 'edit',
        label: this.i18n.t('eventDetail.editEvent'),
        icon: ICONS['pen'],
      });
    }
    if (permissions.canChangeEventStatus && event?.status === 'draft') {
      items.push({
        id: 'publish',
        label: this.i18n.t('eventDetail.publish'),
        icon: ICONS['paperPlane'],
      });
    }
    if (permissions.canExport) {
      items.push({
        id: 'copy',
        label: this.i18n.t('eventDetail.copyInvitation'),
        icon: ICONS['copy'],
      });
    }
    return items;
  });

  /** Única ação no cabeçalho; as restantes ficam no rail. */
  protected readonly primarySectionAction = computed<ActionMenuItem | null>(() =>
    this.effectivePermissions().canManageGuests
      ? {
          id: 'addGuest',
          label: this.i18n.t('eventDetail.addGuest'),
          icon: ICONS['userPlus'],
          disabled: this.eventCancelled(),
        }
      : null,
  );

  protected readonly managers = computed(() => this.store.managersFor(this.eventId()));
  protected readonly guestCounts = computed(() => {
    const stats = this.stats();
    return {
      all: stats.total,
      confirmed: stats.confirmed,
      pending: stats.pending,
      declined: stats.declined,
    };
  });
  protected readonly visibleTasks = computed(() => {
    const tasks = this.tasks();
    if (!this.onlyMine()) {
      return tasks;
    }
    const email = this.store.profile().email;
    return tasks.filter((task) =>
      this.accessRole() === 'host'
        ? task.managerEmail === null
        : !!email && task.managerEmail === email,
    );
  });
  protected readonly taskAssignees = computed(() =>
    this.managers().map((manager) => ({
      id: manager.id,
      label: manager.displayName ?? manager.email ?? manager.phone ?? manager.id,
    })),
  );
  /**
   * O backend usa o fim do dia de `starts_at` no fuso do evento quando não
   * existe `ends_at`; o limite apresentado é conservador (data + 1 dia).
   */
  protected readonly maxValidityDate = computed(() => {
    const event = this.event();
    return event ? isoDatePlusDays(event.startsAt, 1) : '';
  });

  /** O link do convite pode ir até 30 dias depois do fim do evento. */
  protected readonly maxInvitationDate = computed(() => {
    const event = this.event();
    return event ? isoDatePlusDays(event.endsAt || event.startsAt, 30) : '';
  });

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

  /**
   * O backend aceita no máximo 366 dias e exige `from <= to`. A
   * validação local evita um pedido que só falharia no servidor.
   */
  protected readonly periodInvalid = computed(() => {
    const from = this.periodFrom();
    const to = this.periodTo();
    if (!from || !to || from > to) {
      return true;
    }

    const start = Date.parse(`${from}T00:00:00Z`);
    const end = Date.parse(`${to}T00:00:00Z`);
    return !Number.isFinite(start) || !Number.isFinite(end) || (end - start) / 86_400_000 + 1 > 366;
  });

  protected readonly guestRangeLabel = computed(() => {
    const pagination = this.guestPagination();
    if (!pagination || pagination.total === 0) {
      return '';
    }
    const start = (pagination.page - 1) * pagination.page_size + 1;
    const end = Math.min(pagination.page * pagination.page_size, pagination.total);
    return `${start}–${end} / ${pagination.total}`;
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

  protected readonly taskForm = this.fb.group({
    label: ['', [Validators.required, Validators.maxLength(200)]],
    managerId: [''],
  });

  protected readonly coverForm = this.fb.group({
    url: ['', [Validators.pattern(/^https:\/\/.+/), Validators.maxLength(500)]],
  });

  constructor() {
    this.tab.set(parseEventTab(this.route.snapshot.queryParamMap.get('separador')));
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const next = parseEventTab(params.get('separador'));
      if (next !== this.tab()) {
        this.tab.set(next);
      }
    });

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
      const event = this.event();
      if (!event || this.periodInitialised) {
        return;
      }

      // O período começa na criação do projeto, para que o primeiro
      // relatório mostre todo o movimento acumulado. Projetos com mais
      // de um ano arrancam nos últimos 366 dias, que é o limite aceite
      // pelo backend.
      this.periodInitialised = true;
      const created = event.createdAt.slice(0, 10);
      const earliest = isoDaysAgo(365);
      this.periodFrom.set(created < earliest ? earliest : created);
      this.periodTo.set(todayIso());
    });
    effect(() => {
      if (this.tab() === 'gestores' && this.permissions().canManageManagers) {
        untracked(() => void this.refreshManagers());
      }
    });
    effect(() => {
      if (this.tab() === 'equipas' && this.teams().length === 0) {
        untracked(() => void this.loadTeams());
      }
    });
    effect(() => {
      const event = this.event();
      untracked(() => {
        void this.loadActivity(1);
        void this.loadGuests();
        this.coverForm.reset({ url: event?.coverUrl ?? '' });
      });
    });
    this.destroyRef.onDestroy(() => {
      if (this.guestDebounce) {
        clearTimeout(this.guestDebounce);
      }
    });
  }

  protected setTab(tab: EventTab): void {
    if (tab === this.tab()) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { separador: eventTabQuery(tab) },
      queryParamsHandling: 'merge',
    });
  }

  protected onSectionChange(id: string): void {
    this.setTab(id as EventTab);
  }

  protected onSectionAction(id: string): void {
    switch (id) {
      case 'addGuest':
        this.openGuestCreate();
        break;
      case 'edit':
        this.openEditModal();
        break;
      case 'publish':
        void this.publish();
        break;
      case 'copy':
        void this.copyInvitation();
        break;
    }
  }

  /** Pesquisa/filtro/paginação de convidados, sempre no servidor. */
  protected async loadGuests(): Promise<void> {
    const seq = ++this.guestRequestSeq;
    this.guestListLoading.set(true);
    const query: GuestsQuery = {
      event_id: this.eventId(),
      status: this.guestFilter(),
      q: this.guestSearch().trim() || undefined,
      page: this.guestPage(),
      page_size: 10,
    };
    try {
      const result = await this.store.guestsPage(query);
      if (seq !== this.guestRequestSeq) {
        return;
      }
      const event = this.event();
      this.guestItems.set(
        result.items.map((entry) => ({
          guest: entry.guest,
          event: event ?? entry.event,
        })),
      );
      this.guestPagination.set(result.pagination);
      this.guestListLoaded.set(true);
    } catch (error: unknown) {
      if (seq === this.guestRequestSeq) {
        this.guestItems.set([]);
        this.toasts.error(toApiError(error).message);
      }
    } finally {
      if (seq === this.guestRequestSeq) {
        this.guestListLoading.set(false);
      }
    }
  }

  protected onGuestSearch(value: string): void {
    this.guestSearch.set(value);
    this.guestPage.set(1);
    if (this.guestDebounce) {
      clearTimeout(this.guestDebounce);
    }
    this.guestDebounce = setTimeout(() => void this.loadGuests(), 300);
  }

  protected setGuestFilter(filter: GuestFilter): void {
    this.guestFilter.set(filter);
    this.guestPage.set(1);
    void this.loadGuests();
  }

  protected goToGuestPage(page: number): void {
    const pagination = this.guestPagination();
    if (!pagination || page < 1 || page > pagination.total_pages || page === this.guestPage()) {
      return;
    }
    this.guestPage.set(page);
    void this.loadGuests();
    if (isPlatformBrowser(this.platformId)) {
      this.document.getElementById('event-guests-list')?.scrollIntoView({ block: 'start' });
    }
  }

  protected guestMeta(entry: GuestListEntry): PersonMetaItem[] {
    const meta: PersonMetaItem[] = [
      {
        icon: 'clock',
        label: `${this.i18n.t('guests.tableInvited')}: ${this.i18n.shortDate(entry.guest.invitedAt, entry.event.timezone)}`,
      },
      {
        icon: 'envelopeOpen',
        label: entry.guest.openedAt
          ? `${this.i18n.t('guests.opened')} · ${this.i18n.relative(entry.guest.openedAt)}`
          : this.i18n.t('guests.notOpened'),
      },
      {
        icon: 'location',
        label: `${this.i18n.t('eventDetail.table.table')}: ${entry.guest.tableName ?? '—'}`,
      },
    ];
    return meta;
  }

  protected guestPrimary(entry: GuestListEntry): PersonPrimaryAction | null {
    if (!this.isHost() || !entry.guest.phone) {
      return null;
    }
    return {
      id: 'whatsapp',
      label: this.i18n.t('guests.whatsappShort'),
      icon: ICONS['whatsapp'],
      hint: this.i18n.t('guests.whatsapp'),
    };
  }

  protected guestActions() {
    const items = [
      { id: 'edit', label: this.i18n.t('guests.editAction'), icon: ICONS['pen'] },
      { id: 'resend', label: this.i18n.t('eventDetail.resend'), icon: ICONS['paperPlane'] },
      { id: 'ticket', label: this.i18n.t('eventDetail.ticket'), icon: ICONS['ticket'] },
      {
        id: 'remove',
        label: this.i18n.t('guests.remove'),
        icon: ICONS['trash'],
        tone: 'danger' as const,
      },
    ];
    return this.isHost() ? items : [];
  }

  protected onGuestPrimary(action: string, entry: GuestListEntry): void {
    if (action === 'whatsapp') {
      this.forwardWhatsApp(entry.guest);
    }
  }

  protected onGuestAction(action: string, entry: GuestListEntry): void {
    switch (action) {
      case 'edit':
        this.openGuestEdit(entry.guest);
        break;
      case 'resend':
        void this.resend(entry.guest);
        break;
      case 'ticket':
        void this.downloadTicket(entry.guest);
        break;
      case 'remove':
        void this.removeGuest(entry.guest);
        break;
      default:
        break;
    }
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

  protected async removeActivity(item: EventActivity): Promise<void> {
    if (this.activityBusyId()) {
      return;
    }
    this.activityBusyId.set(item.id);
    try {
      await this.api.delete(
        `/host/events/${encodeURIComponent(this.eventId())}/activity/${encodeURIComponent(item.id)}`,
      );
      this.toasts.success(this.i18n.t('management.activityRemoved'));
      await this.loadActivity(this.activityPagination()?.page ?? 1);
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.activityBusyId.set(null);
    }
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
        this.toasts.success(this.i18n.t('eventDetail.manageLinkQueued'));
      } else {
        this.toasts.error(this.i18n.t('eventDetail.manageLinkFailed'));
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

  /** Leva o anfitrião ao separador onde pode gerir a equipa. */
  protected openManagersTab(): void {
    this.setTab('gestores');
  }

  protected async loadTeams(): Promise<void> {
    if (this.teamsLoading()) {
      return;
    }
    this.teamsLoading.set(true);
    try {
      const page = await this.teamsRepository.list({ eventId: this.eventId(), pageSize: 100 });
      this.teams.set(page.items);
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.teamsLoading.set(false);
    }
  }

  protected openTeam(team: Team): void {
    void this.router.navigate(['/equipas', team.id], {
      queryParams: { evento: this.eventId() },
    });
  }

  protected async openTaskDialog(): Promise<void> {
    if (this.teams().length === 0) {
      await this.loadTeams();
    }
    this.taskDialogOpen.set(true);
  }

  protected async submitTask(value: {
    label: string;
    eventId: string;
    teamId: string | null;
    assigneeMemberId: string | null;
  }): Promise<void> {
    if (this.creatingTask()) {
      return;
    }
    this.creatingTask.set(true);
    try {
      await this.store.createTask(
        value.label.trim(),
        value.eventId || this.eventId(),
        value.assigneeMemberId,
      );
      this.taskDialogOpen.set(false);
      this.toasts.success(this.i18n.t('eventDetail.taskCreated'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.creatingTask.set(false);
    }
  }

  protected openEditModal(): void {
    this.editModalOpen.set(true);
  }

  protected closeEditModal(): void {
    this.editModalOpen.set(false);
  }

  protected openCoverModal(): void {
    this.coverModalOpen.set(true);
  }

  protected closeCoverModal(): void {
    this.cancelCoverUpload();
    this.coverModalOpen.set(false);
  }

  /** Abre o modal partilhado de criação de equipa + gestor com o evento fixo. */
  protected openManagerDialog(): void {
    this.managerDialogOpen.set(true);
  }

  protected closeManagerDialog(): void {
    this.managerDialogOpen.set(false);
  }

  protected onManagerCreated(): void {
    this.managerDialogOpen.set(false);
    void this.refreshManagers();
    void this.loadTeams();
    void this.store.load();
  }

  protected async regenerateManagerCode(manager: EventManager): Promise<void> {
    if (this.managerBusyId()) {
      return;
    }
    this.managerBusyId.set(manager.id);
    try {
      const result = await this.eventsRepository.regenerateManagerAccess(this.eventId(), manager.id);
      this.showCredentials(result);
      this.toasts.success(this.i18n.t('eventDetail.managerCodeRegenerated'));
      await this.refreshManagers();
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.managerBusyId.set(null);
    }
  }

  protected async changeManagerValidity(value: {
    manager: EventManager;
    date: string;
  }): Promise<void> {
    if (this.managerBusyId()) {
      return;
    }
    this.managerBusyId.set(value.manager.id);
    try {
      await this.eventsRepository.updateManagerLink(
        this.eventId(),
        value.manager.id,
        `${value.date}T23:59:59.000Z`,
      );
      this.toasts.success(this.i18n.t('eventDetail.managerValiditySaved'));
      await this.refreshManagers();
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.managerBusyId.set(null);
    }
  }

  protected async revokeManagerAccess(manager: EventManager): Promise<void> {
    if (this.managerBusyId()) {
      return;
    }
    this.managerBusyId.set(manager.id);
    try {
      await this.eventsRepository.revokeManagerLink(this.eventId(), manager.id);
      this.toasts.success(this.i18n.t('eventDetail.managerAccessRevoked'));
      await this.refreshManagers();
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.managerBusyId.set(null);
    }
  }

  protected async removeManagerFromEvent(manager: EventManager): Promise<void> {
    if (this.managerBusyId()) {
      return;
    }
    this.managerBusyId.set(manager.id);
    try {
      await this.store.removeManager(this.eventId(), manager.id);
      this.toasts.success(
        this.i18n.t('eventDetail.managerRemoved', {
          email: manager.email ?? manager.phone ?? manager.id,
        }),
      );
      await this.refreshManagers();
      await this.loadTeams();
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.managerBusyId.set(null);
    }
  }

  protected closeCredentials(): void {
    this.credentialsOpen.set(false);
    this.credentials.set(null);
  }

  protected async copyInvitation(): Promise<void> {
    const url = this.share.absoluteUrl(`/convite/${this.eventId()}`);
    this.toasts.success(
      (await this.share.copy(url))
        ? this.i18n.t('common.copied')
        : this.i18n.t('common.copyError'),
    );
  }

  protected openInvitation(): void {
    this.share.openExternal(this.share.absoluteUrl(`/convite/${this.eventId()}`));
  }

  protected onOnlyMineChange(value: boolean): void {
    this.onlyMine.set(value);
  }

  private showCredentials(result: ManagerCreationResult | ManagerInviteResult): void {
    const team =
      'team' in result
        ? result.team
        : this.teams().find((item) => item.id === result.manager.teamId);
    if (!team || !result.link || !result.accessCode) {
      this.toasts.error(this.i18n.t('eventDetail.permissionsHint'));
      return;
    }
    this.credentials.set({
      manager: result.manager,
      team,
      link: result.link,
      accessCode: result.accessCode,
      emailStatus: result.emailStatus,
    });
    this.credentialsOpen.set(true);
  }

  protected openGuestCreate(): void {
    this.guestEditTarget.set(null);
    this.guestDialogOpen.set(true);
  }

  protected openGuestEdit(guest: Guest): void {
    this.guestEditTarget.set(guest);
  }

  protected closeGuestDialog(): void {
    this.guestDialogOpen.set(false);
    this.guestEditTarget.set(null);
    void this.loadGuests();
  }

  protected openLinkDialog(guest: Guest): void {
    if (!this.effectivePermissions().canEditExistingGuests) {
      return;
    }
    this.linkGuest.set(guest);
    this.linkError.set('');
    this.linkDialogOpen.set(true);
  }

  protected closeLinkDialog(): void {
    this.linkDialogOpen.set(false);
    this.linkGuest.set(null);
    this.linkError.set('');
    this.linkSaving.set(false);
  }

  protected async saveLinkValidity(expiresAt: string): Promise<void> {
    const event = this.event();
    const guest = this.linkGuest();
    if (!event || !guest || this.linkSaving()) {
      return;
    }
    this.linkSaving.set(true);
    this.linkError.set('');
    try {
      await this.eventsRepository.updateInvitationLink(event.id, guest.id, expiresAt);
      this.closeLinkDialog();
      this.toasts.success(this.i18n.t('eventDetail.linkValiditySaved'));
      await this.loadGuests();
    } catch (error: unknown) {
      this.linkError.set(toApiError(error).message);
    } finally {
      this.linkSaving.set(false);
    }
  }

  protected toggleExport(): void {
    this.exportOpen.update((open) => !open);
  }

  /** Descarrega um documento do evento (PDF ou CSV). */
  protected async exportDocument(
    document: EventExportDocument,
    format: ReportExportFormat,
  ): Promise<void> {
    const key = `${document}-${format}`;
    if (this.exporting() !== null) {
      return;
    }

    this.exportOpen.set(false);
    this.exporting.set(key);

    try {
      const file = await this.reports.exportEvent(this.eventId(), document, format);
      this.downloads.save(file, `conto-contigo-${document}.${format}`);
      this.toasts.success(this.i18n.t('eventDetail.exported'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.exporting.set(null);
    }
  }

  protected setPeriodFrom(value: string): void {
    this.periodFrom.set(value);
  }

  protected setPeriodTo(value: string): void {
    this.periodTo.set(value);
  }

  /**
   * Descarrega o relatório do projeto para o período escolhido.
   *
   * O backend interpreta `from` e `to` como dias UTC, inclusive, e
   * devolve o movimento do período com o estado atual em separado.
   */
  protected async exportPeriodReport(format: ReportExportFormat): Promise<void> {
    if (this.exporting() !== null || this.periodInvalid()) {
      return;
    }

    const key = `period-${format}`;
    this.exportOpen.set(false);
    this.exporting.set(key);

    try {
      const file = await this.reports.exportEventPeriod(
        this.eventId(),
        this.periodFrom(),
        this.periodTo(),
        format,
      );
      this.downloads.save(file, `conto-contigo-relatorio-periodo.${format}`);
      this.toasts.success(this.i18n.t('eventDetail.exported'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.exporting.set(null);
    }
  }

  /** Descarrega o bilhete individual com o QR do convite. */
  protected async downloadTicket(guest: Guest): Promise<void> {
    const key = `ticket-${guest.id}`;
    if (this.exporting() !== null) {
      return;
    }

    this.exporting.set(key);

    try {
      const file = await this.reports.exportEvent(this.eventId(), 'ticket', 'pdf', guest.id);
      this.downloads.save(file, 'conto-contigo-bilhete.pdf');
      this.toasts.success(this.i18n.t('eventDetail.ticketDownloaded', { name: guest.name }));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.exporting.set(null);
    }
  }

  protected async removeManager(manager: EventManager): Promise<void> {
    this.managerBusyId.set(manager.id);
    try {
      await this.store.removeManager(this.eventId(), manager.id);
      this.toasts.success(
        this.i18n.t('eventDetail.managerRemoved', { email: manager.email ?? manager.phone ?? manager.id }),
      );
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
        this.toasts.success(
          this.i18n.t('eventDetail.managerResent', { email: manager.email ?? manager.phone ?? manager.id }),
        );
      } else {
        this.toasts.error(
          this.i18n.t('eventDetail.managerResentFailed', {
            email: manager.email ?? manager.phone ?? manager.id,
          }),
        );
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
      void this.recordWhatsappShare(guest);
    }
  }

  /** Regista a partilha de um convite específico sem bloquear novo envio. */
  private async recordWhatsappShare(guest: Guest): Promise<void> {
    if (!guest.invitationUrl) {
      return;
    }
    try {
      const updated = await this.store.markWhatsappShared(guest);
      this.guestItems.update((items) =>
        items.map((entry) => (entry.guest.id === updated.id ? { ...entry, guest: updated } : entry)),
      );
    } catch {
      // A partilha no WhatsApp já foi aberta; apenas o registo falhou.
    }
  }

  protected async removeGuest(guest: Guest): Promise<void> {
    try {
      await this.store.removeGuest(guest.id);
      this.toasts.success(this.i18n.t('guests.removed'));
      await this.loadGuests();
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
