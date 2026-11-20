import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ApiClient } from '../../core/api/api-client';
import { toApiError } from '../../core/api/api-error';
import { ApiActivity, ApiEvent, ApiInvitation, Pagination } from '../../core/api/api.models';
import {
  locationFromView,
  mapActivity,
  mapEvent,
  mapInvitation,
  statsForGuests,
} from '../../core/api/mappers';
import { ActivityRepository } from '../../core/data/activity.repository';
import { EventsRepository } from '../../core/data/events.repository';
import { GuestListEntry, GuestsQuery, GuestsRepository } from '../../core/data/guests.repository';
import { TeamsRepository } from '../../core/data/teams.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import {
  EventActivity,
  EventManager,
  EventPermissions,
  EventStats,
  Guest,
  HostEvent,
  managerPermissions,
  Team,
  WorkspaceTask,
} from '../../core/models/models';
import { ShareService } from '../../core/services/share.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { BrandComponent } from '../../shared/components/brand.component';
import { GuestDialogComponent } from '../../shared/components/guest-dialog.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import {
  EVENT_TABS,
  EventTab,
  eventTabQuery,
  GuestFilter,
  parseEventTab,
} from '../events/detail/detail.models';
import { EventActivitySectionComponent } from '../events/detail/event-activity-section.component';
import { EventGuestsSectionComponent } from '../events/detail/event-guests-section.component';
import { EventManagersSectionComponent } from '../events/detail/event-managers-section.component';
import { EventSummaryComponent } from '../events/detail/event-summary.component';
import { EventTasksSectionComponent } from '../events/detail/event-tasks-section.component';
import { EventTeamsSectionComponent } from '../events/detail/event-teams-section.component';

interface EventDetailResponse {
  event: ApiEvent;
  invitations: ApiInvitation[];
  activity?: ApiActivity[];
}

/** Data `YYYY-MM-DD` some dias depois da data indicada. */
function isoDatePlusDays(value: string, days: number): string {
  const base = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-management-event-page',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    FaIconComponent,
    BrandComponent,
    GuestDialogComponent,
    ModalComponent,
    PreferenceControlsComponent,
    SkeletonComponent,
    EventActivitySectionComponent,
    EventGuestsSectionComponent,
    EventManagersSectionComponent,
    EventSummaryComponent,
    EventTasksSectionComponent,
    EventTeamsSectionComponent,
  ],
  templateUrl: './management-event.page.html',
})
export class ManagementEventPage {
  private readonly api = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly guestsRepo = inject(GuestsRepository);
  private readonly teamsRepo = inject(TeamsRepository);
  private readonly eventsRepo = inject(EventsRepository);
  private readonly activityRepo = inject(ActivityRepository);
  private readonly share = inject(ShareService);
  private readonly toasts = inject(ToastService);
  private readonly store = inject(WorkspaceStore);

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly tabs = EVENT_TABS;

  private readonly routeEventId = signal('');
  protected readonly event = signal<HostEvent | null>(null);
  protected readonly detailGuests = signal<Guest[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly actionError = signal('');
  protected readonly feedback = signal('');
  protected readonly pendingAction = signal<string | null>(null);

  protected readonly tab = signal<EventTab>('resumo');
  /** Separação de capacidades: o painel de gestão nunca usa permissões de anfitrião. */
  protected readonly permissions = computed<EventPermissions>(() =>
    managerPermissions({ accessRole: this.event()?.accessRole ?? 'manager' }),
  );
  protected readonly stats = computed<EventStats>(
    () => this.event()?.stats ?? statsForGuests(this.detailGuests()),
  );
  protected readonly typeLabel = computed(() => {
    const type = this.event()?.type;
    return type ? this.i18n.t(`type.${type}` as TranslationKey) : '';
  });
  protected readonly templateName = computed(() => {
    const id = this.event()?.templateId;
    return id ? (this.store.templates().find((item) => item.id === id)?.name ?? '') : '';
  });
  protected readonly deadlinePassed = computed(() => {
    const deadline = this.event()?.rsvpDeadline;
    return !!deadline && Date.now() > new Date(deadline).getTime();
  });
  protected readonly maxValidityDate = computed(() =>
    isoDatePlusDays(this.event()?.startsAt ?? '', 1),
  );
  protected readonly guestCounts = computed(() => {
    const stats = this.stats();
    return {
      all: stats.total,
      confirmed: stats.confirmed,
      pending: stats.pending,
      declined: stats.declined,
    };
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

  protected readonly guestSearch = signal('');
  protected readonly guestFilter = signal<GuestFilter>('all');
  protected readonly guestPage = signal(1);
  protected readonly guestItems = signal<GuestListEntry[]>([]);
  protected readonly guestPagination = signal<Pagination | null>(null);
  protected readonly guestLoading = signal(false);
  protected readonly guestListLoaded = signal(false);
  private guestRequestSeq = 0;
  private guestDebounce: ReturnType<typeof setTimeout> | null = null;
  protected readonly guestDialogOpen = signal(false);

  protected readonly teams = signal<Team[]>([]);
  protected readonly teamsLoading = signal(false);
  protected readonly managers = signal<EventManager[]>([]);
  protected readonly managersLoading = signal(false);

  protected readonly activityItems = signal<EventActivity[]>([]);
  protected readonly activityPagination = signal<Pagination | null>(null);
  protected readonly activityLoading = signal(false);
  protected readonly activityLoaded = signal(false);

  protected readonly tasks = computed<WorkspaceTask[]>(() =>
    this.store.tasks().filter((task) => task.eventId === this.routeEventId()),
  );
  protected readonly tasksDone = computed(() => this.tasks().filter((task) => task.done).length);

  /** Gestor sem conta: CTA repetido em faixa e cabeçalho. */
  protected readonly needsAccount = signal(false);
  protected readonly accountEmail = signal('');
  protected readonly accountModalOpen = signal(false);

  protected readonly editModalOpen = signal(false);
  protected readonly coverModalOpen = signal(false);
  protected readonly coverUploading = signal(false);
  protected readonly coverProgress = signal(0);
  private coverUploadHandle: { cancel: () => void } | null = null;

  protected readonly editForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    venue: ['', [Validators.maxLength(200)]],
    city: ['', [Validators.maxLength(300)]],
    message: ['', [Validators.maxLength(4000)]],
    rules: ['', [Validators.maxLength(4000)]],
    dressCode: ['', [Validators.maxLength(200)]],
  });

  protected readonly coverForm = this.formBuilder.nonNullable.group({
    url: ['', [Validators.pattern(/^https:\/\/.+/), Validators.maxLength(500)]],
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const eventId = params.get('eventId') ?? '';
      if (eventId === this.routeEventId()) {
        return;
      }
      this.routeEventId.set(eventId);
      this.resetSections();
      if (eventId) {
        void this.load(eventId);
      }
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.needsAccount.set(params.get('sem_conta') === '1');
      this.accountEmail.set(params.get('email') ?? '');
      const next = parseEventTab(params.get('separador'));
      if (next !== this.tab()) {
        this.tab.set(next);
      }
    });

    effect(() => {
      const tab = this.tab();
      const event = this.event();
      if (!event) {
        return;
      }
      untracked(() => {
        if (tab === 'convidados' && !this.guestListLoaded() && !this.guestLoading()) {
          void this.loadGuests();
        }
        if (tab === 'equipas' && this.teams().length === 0 && !this.teamsLoading()) {
          void this.loadTeams();
        }
        if (tab === 'gestores' && this.managers().length === 0 && !this.managersLoading()) {
          void this.loadManagers();
        }
        if (tab === 'atividade' && !this.activityLoaded() && !this.activityLoading()) {
          void this.loadActivity(1);
        }
      });
    });

    this.destroyRef.onDestroy(() => {
      if (this.guestDebounce) {
        clearTimeout(this.guestDebounce);
      }
    });
  }

  protected setTab(tab: EventTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { separador: eventTabQuery(tab) },
      queryParamsHandling: 'preserve',
    });
  }

  /** Ações que exigem conta abrem o modal em vez de falhar com 401/403. */
  protected requireAccount(): boolean {
    if (!this.needsAccount()) {
      return false;
    }
    this.accountModalOpen.set(true);
    return true;
  }

  protected openAccountModal(): void {
    this.accountModalOpen.set(true);
  }

  protected closeAccountModal(): void {
    this.accountModalOpen.set(false);
  }

  protected continueWithoutAccount(): void {
    this.closeAccountModal();
  }

  protected createAccount(): void {
    const returnUrl = `/gestao/evento/${this.routeEventId()}`;
    this.accountModalOpen.set(false);
    void this.router.navigate(['/criar-conta'], {
      queryParams: {
        ...(this.accountEmail() ? { email: this.accountEmail(), gestor: 1 } : {}),
        returnUrl,
      },
    });
  }

  protected async retry(): Promise<void> {
    const eventId = this.routeEventId();
    if (eventId) {
      await this.load(eventId);
    }
  }

  /** Pesquisa/filtro/paginação de convidados, sempre no servidor. */
  protected async loadGuests(): Promise<void> {
    const eventId = this.routeEventId();
    if (!eventId) {
      return;
    }
    const seq = ++this.guestRequestSeq;
    this.guestLoading.set(true);
    const query: GuestsQuery = {
      event_id: eventId,
      status: this.guestFilter(),
      q: this.guestSearch().trim() || undefined,
      page: this.guestPage(),
      page_size: 10,
    };
    try {
      const result = await this.guestsRepo.listPage(query);
      if (seq !== this.guestRequestSeq) {
        return;
      }
      const event = this.event();
      this.guestItems.set(
        result.items.map((entry) => ({ guest: entry.guest, event: event ?? entry.event })),
      );
      this.guestPagination.set(result.pagination);
      this.guestListLoaded.set(true);
    } catch (error: unknown) {
      if (seq === this.guestRequestSeq) {
        this.guestItems.set([]);
        this.actionError.set(toApiError(error).message);
      }
    } finally {
      if (seq === this.guestRequestSeq) {
        this.guestLoading.set(false);
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
  }

  protected openGuestCreate(): void {
    if (this.requireAccount()) {
      return;
    }
    this.guestDialogOpen.set(true);
  }

  protected closeGuestDialog(): void {
    this.guestDialogOpen.set(false);
    this.mergeAddedGuests();
    this.guestListLoaded.set(false);
    if (this.tab() === 'convidados') {
      void this.loadGuests();
    }
  }

  /** Equipas e gestores só são pedidos quando o separador é aberto. */
  protected async loadTeams(): Promise<void> {
    if (this.teamsLoading()) {
      return;
    }
    this.teamsLoading.set(true);
    try {
      const page = await this.teamsRepo.list({ eventId: this.routeEventId(), pageSize: 100 });
      this.teams.set(page.items);
    } catch {
      this.teams.set([]);
    } finally {
      this.teamsLoading.set(false);
    }
  }

  protected async loadManagers(): Promise<void> {
    if (this.managersLoading()) {
      return;
    }
    this.managersLoading.set(true);
    try {
      this.managers.set(await this.eventsRepo.listManagers(this.routeEventId()));
    } catch {
      this.managers.set([]);
    } finally {
      this.managersLoading.set(false);
    }
  }

  protected openTeam(team: Team): void {
    void this.router.navigate(['/equipas', team.id], {
      queryParams: { evento: this.routeEventId() },
    });
  }

  /** O gestor não escreve tarefas: a secção emite, a página não altera nada. */
  protected onTaskToggle(): void {
    return;
  }

  protected async loadActivity(page = 1): Promise<void> {
    const eventId = this.routeEventId();
    if (!eventId) {
      return;
    }
    this.activityLoading.set(true);
    try {
      const result = await this.activityRepo.listForEvent(eventId, page, 8);
      this.activityItems.set(result.items);
      this.activityPagination.set(result.pagination);
      this.activityLoaded.set(true);
    } catch (error: unknown) {
      this.activityItems.set([]);
      this.activityPagination.set(null);
      this.actionError.set(toApiError(error).message);
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

  protected openEditModal(): void {
    if (this.requireAccount()) {
      return;
    }
    this.editModalOpen.set(true);
  }

  protected closeEditModal(): void {
    this.editModalOpen.set(false);
  }

  protected openCoverModal(): void {
    if (this.requireAccount()) {
      return;
    }
    this.coverModalOpen.set(true);
  }

  protected closeCoverModal(): void {
    this.cancelCoverUpload();
    this.coverModalOpen.set(false);
  }

  protected async saveDetails(): Promise<void> {
    const current = this.event();
    if (!current || this.pendingAction()) {
      return;
    }
    const value = this.editForm.getRawValue();
    const venueMissing = !current.onlineLink && value.venue.trim().length === 0;
    if (this.editForm.invalid || venueMissing) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.pendingAction.set('details');
    this.actionError.set('');
    this.feedback.set('');
    const body: Record<string, unknown> = {
      title: value.title.trim(),
      message: value.message.trim(),
      rules: value.rules.trim(),
      dress_code: value.dressCode.trim(),
      location: locationFromView(current, {
        venue: value.venue.trim(),
        city: value.city.trim(),
      }),
    };
    try {
      const response = await this.api.patch<ApiEvent>(
        `/host/events/${encodeURIComponent(current.id)}`,
        body,
      );
      const updated = mapEvent(response);
      updated.accessRole = current.accessRole;
      this.event.set({ ...updated, stats: updated.stats ?? current.stats });
      this.feedback.set(this.i18n.t('eventDetail.changesSaved'));
    } catch (error: unknown) {
      this.actionError.set(toApiError(error).message);
    } finally {
      this.pendingAction.set(null);
    }
  }

  protected async setCoverUrl(): Promise<void> {
    const current = this.event();
    if (!current || this.pendingAction() || this.coverForm.invalid) {
      this.coverForm.markAllAsTouched();
      return;
    }
    const url = this.coverForm.controls.url.value.trim();
    if (!url) {
      return;
    }
    this.pendingAction.set('cover');
    this.actionError.set('');
    this.feedback.set('');
    try {
      const response = await this.api.put<ApiEvent>(
        `/host/events/${encodeURIComponent(current.id)}/cover`,
        { cover_url: url },
      );
      this.applyCover(response, current);
      this.feedback.set(this.i18n.t('eventDetail.coverSaved'));
    } catch (error: unknown) {
      this.actionError.set(toApiError(error).message);
    } finally {
      this.pendingAction.set(null);
    }
  }

  protected onCoverFile(input: Event): void {
    const target = input.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (file) {
      void this.uploadCover(file);
    }
  }

  protected async uploadCover(file: File): Promise<void> {
    const current = this.event();
    if (!current || this.coverUploading()) {
      return;
    }
    this.coverUploading.set(true);
    this.coverProgress.set(0);
    this.actionError.set('');
    this.feedback.set('');
    const body = new FormData();
    body.append('cover', file);
    const handle = this.api.postFormWithProgress<ApiEvent>(
      `/host/events/${encodeURIComponent(current.id)}/cover/upload`,
      body,
      { onProgress: (percent) => this.coverProgress.set(percent) },
    );
    this.coverUploadHandle = handle;
    try {
      const response = await handle.promise;
      this.applyCover(response, current);
      this.coverProgress.set(100);
      this.feedback.set(this.i18n.t('eventDetail.coverUploaded'));
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.actionError.set(toApiError(error).message);
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
    const current = this.event();
    if (!current || this.pendingAction()) {
      return;
    }
    this.pendingAction.set('cover');
    this.actionError.set('');
    this.feedback.set('');
    try {
      const response = await this.api.deleteWithData<ApiEvent>(
        `/host/events/${encodeURIComponent(current.id)}/cover`,
      );
      this.applyCover(response, current);
      this.coverForm.reset({ url: '' });
      this.feedback.set(this.i18n.t('eventDetail.coverRemoved'));
    } catch (error: unknown) {
      this.actionError.set(toApiError(error).message);
    } finally {
      this.pendingAction.set(null);
    }
  }

  protected async copyInvitation(): Promise<void> {
    const url = this.share.absoluteUrl(`/convite/${this.routeEventId()}`);
    this.toasts.success(
      (await this.share.copy(url))
        ? this.i18n.t('common.copied')
        : this.i18n.t('common.copyError'),
    );
  }

  protected openInvitation(): void {
    this.share.openExternal(this.share.absoluteUrl(`/convite/${this.routeEventId()}`));
  }

  private applyCover(response: ApiEvent, current: HostEvent): void {
    const updated = mapEvent(response);
    updated.accessRole = current.accessRole;
    this.event.set({ ...updated, stats: updated.stats ?? current.stats });
  }

  private mergeAddedGuests(): void {
    const known = new Set(this.detailGuests().map((guest) => guest.id));
    const added = this.guestsRepo.forEvent(this.routeEventId()).filter((guest) => !known.has(guest.id));
    if (added.length === 0) {
      return;
    }
    this.detailGuests.update((guests) => [...added, ...guests]);
    this.event.update((current) =>
      current ? { ...current, stats: statsForGuests(this.detailGuests()) } : current,
    );
  }

  private resetSections(): void {
    this.event.set(null);
    this.detailGuests.set([]);
    this.loading.set(true);
    this.error.set('');
    this.actionError.set('');
    this.feedback.set('');
    this.guestItems.set([]);
    this.guestPagination.set(null);
    this.guestLoading.set(false);
    this.guestListLoaded.set(false);
    this.guestPage.set(1);
    this.guestSearch.set('');
    this.guestFilter.set('all');
    this.teams.set([]);
    this.managers.set([]);
    this.activityItems.set([]);
    this.activityPagination.set(null);
    this.activityLoaded.set(false);
  }

  private async load(eventId: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.api.get<EventDetailResponse>(
        `/host/events/${encodeURIComponent(eventId)}`,
      );
      const mapped = mapEvent(result.event);
      // Um link de gestão sem `access_role` explícito é sempre o papel mais restritivo.
      if (!result.event.access_role) {
        mapped.accessRole = 'manager';
      }
      this.event.set(mapped);
      this.detailGuests.set((result.invitations ?? []).map(mapInvitation));
      this.editForm.reset({
        title: mapped.title,
        venue: mapped.venue,
        city: mapped.city,
        message: mapped.message,
        rules: mapped.rules,
        dressCode: mapped.dressCode,
      });
      this.coverForm.reset({ url: mapped.coverUrl ?? '' });
      if (result.activity?.length) {
        this.activityItems.set(result.activity.map(mapActivity));
      }
    } catch (error: unknown) {
      const apiError = toApiError(error);
      this.error.set(
        apiError.status === 401 || apiError.status === 404
          ? this.i18n.t('management.eventUnavailable')
          : apiError.message,
      );
    } finally {
      this.loading.set(false);
    }
  }
}
