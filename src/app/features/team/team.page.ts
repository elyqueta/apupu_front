import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { toApiError } from '../../core/api/api-error';
import { TeamsRepository } from '../../core/data/teams.repository';
import {
  DEFAULT_TEAM_FILTERS,
  hasActiveTeamFilters,
  sameTeamFilters,
  TeamCategoryFilter,
  TeamEventStatusFilter,
  TeamFilters,
  TeamRoleFilter,
  teamFiltersFromParams,
  teamFiltersToParams,
  teamFiltersToQuery,
} from '../../core/data/teams.query';
import { teamErrorMessage } from '../../core/i18n/team-errors';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import {
  EventStatus,
  Team,
  TeamCategory,
  TeamEventStatus,
  TeamManager,
  TeamMyRole,
} from '../../core/models/models';
import { TeamsStore } from '../../core/services/teams.store';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { AvatarStackComponent } from '../../shared/components/avatar-stack.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StatGridComponent } from '../../shared/components/stat-grid.component';
import { TeamFormDialogComponent, TeamFormValue } from './team-form-dialog.component';

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;
/** Acima deste número de eventos, o filtro de evento ganha pesquisa. */
const EVENT_SEARCH_THRESHOLD = 8;

type TeamTab = 'teams' | 'managers';

interface FilterChip {
  id: 'q' | 'role' | 'eventStatus' | 'category' | 'event' | 'mine';
  label: string;
}

interface SelectOption<T extends string> {
  id: T;
  labelKey: TranslationKey;
}

interface ManagerGroup {
  eventId: string;
  title: string;
  startsAt: string | null;
  status: EventStatus;
  timezone: string;
  members: TeamManager[];
}

/**
 * Lista global de equipas (`/equipas`).
 *
 * Os filtros são aplicados no servidor e sincronizados com o URL, para que
 * uma ligação partilhada reabra exatamente a mesma vista. O separador de
 * gestores é só leitura e carrega `GET /host/managers` sob demanda.
 */
@Component({
  selector: 'app-team-page',
  imports: [
    RouterLink,
    FaIconComponent,
    SkeletonComponent,
    StatusBadgeComponent,
    AvatarStackComponent,
    PageHeaderComponent,
    StatCardComponent,
    StatGridComponent,
    TeamFormDialogComponent,
  ],
  templateUrl: './team.page.html',
})
export class TeamPage {
  private readonly store = inject(TeamsStore);
  private readonly repository = inject(TeamsRepository);
  private readonly workspace = inject(WorkspaceStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toasts = inject(ToastService);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  protected readonly filters = signal<TeamFilters>({ ...DEFAULT_TEAM_FILTERS });
  protected readonly searchInput = signal('');
  protected readonly eventSearch = signal('');
  protected readonly tab = signal<TeamTab>('teams');

  protected readonly formOpen = signal(false);
  protected readonly formSaving = signal(false);
  protected readonly formTeam = signal<Team | null>(null);

  protected readonly managerSearch = signal('');
  protected readonly managersLoading = signal(false);

  /** Eventos a que o utilizador tem acesso; a API decide a lista. */
  protected readonly events = this.workspace.events;
  protected readonly eventSearchEnabled = computed(
    () => this.events().length > EVENT_SEARCH_THRESHOLD,
  );
  protected readonly eventOptions = computed(() => {
    const term = this.eventSearch().trim().toLocaleLowerCase(this.i18n.locale());
    const selected = this.filters().eventId;
    if (!term) {
      return this.events();
    }
    return this.events().filter(
      (event) =>
        event.id === selected ||
        event.title.toLocaleLowerCase(this.i18n.locale()).includes(term),
    );
  });
  protected readonly selectedEventTitle = computed(() => {
    const id = this.filters().eventId;
    if (!id) {
      return '';
    }
    return (
      this.events().find((event) => event.id === id)?.title ??
      this.i18n.t('teams.unknownEvent')
    );
  });

  protected readonly items = this.store.items;
  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;
  protected readonly pagination = this.store.pagination;

  protected readonly teamStats = computed(() => {
    const teams = this.items();
    const total = this.pagination()?.total;
    return {
      teams: total ?? teams.length,
      members: teams.reduce((sum, team) => sum + team.memberCount, 0),
      openTasks: teams.reduce((sum, team) => sum + team.openTaskCount, 0),
      doneTasks: teams.reduce((sum, team) => sum + team.completedTaskCount, 0),
      pageHint: total === undefined ? this.i18n.t('teams.statCurrentPageHint') : '',
    };
  });

  private debounce: ReturnType<typeof setTimeout> | null = null;

  protected readonly roleOptions: Array<SelectOption<TeamRoleFilter>> = [
    { id: 'all', labelKey: 'teams.allRoles' },
    { id: 'anfitriao', labelKey: 'teamRole.anfitriao' },
    { id: 'gestor', labelKey: 'teamRole.gestor' },
    { id: 'membro', labelKey: 'teamRole.membro' },
  ];

  protected readonly statusOptions: Array<SelectOption<TeamEventStatusFilter>> = [
    { id: 'all', labelKey: 'teams.allStatuses' },
    { id: 'agendado', labelKey: 'status.agendado' },
    { id: 'em_curso', labelKey: 'status.em_curso' },
    { id: 'concluido', labelKey: 'status.concluido' },
    { id: 'cancelado', labelKey: 'status.cancelado' },
    { id: 'rascunho', labelKey: 'status.rascunho' },
  ];

  protected readonly categoryOptions: Array<SelectOption<TeamCategoryFilter>> = [
    { id: 'all', labelKey: 'teams.allCategories' },
    { id: 'logistica', labelKey: 'teamCategory.logistica' },
    { id: 'decoracao', labelKey: 'teamCategory.decoracao' },
    { id: 'musica', labelKey: 'teamCategory.musica' },
    { id: 'catering', labelKey: 'teamCategory.catering' },
    { id: 'rececao', labelKey: 'teamCategory.rececao' },
    { id: 'outra', labelKey: 'teamCategory.outra' },
  ];

  protected readonly hasFilters = computed(() => hasActiveTeamFilters(this.filters()));

  protected readonly chips = computed<FilterChip[]>(() => {
    const filters = this.filters();
    const chips: FilterChip[] = [];
    const q = filters.q.trim();
    if (q) {
      chips.push({ id: 'q', label: q });
    }
    if (filters.role !== 'all') {
      chips.push({ id: 'role', label: this.i18n.t(this.roleLabelKey(filters.role)) });
    }
    if (filters.eventStatus !== 'all') {
      chips.push({
        id: 'eventStatus',
        label: this.i18n.t(this.statusLabelKey(filters.eventStatus)),
      });
    }
    if (filters.category !== 'all') {
      chips.push({
        id: 'category',
        label: this.i18n.t(this.categoryLabelKey(filters.category)),
      });
    }
    if (filters.eventId) {
      chips.push({ id: 'event', label: this.selectedEventTitle() });
    }
    if (filters.mine) {
      chips.push({ id: 'mine', label: this.i18n.t('teams.filterMine') });
    }
    return chips;
  });

  protected readonly resultsLabel = computed(() => {
    const total = this.pagination()?.total ?? 0;
    return total === 1
      ? this.i18n.t('teams.resultsOne')
      : this.i18n.t('teams.results', { count: total });
  });

  protected readonly rangeLabel = computed(() => {
    const pagination = this.pagination();
    if (!pagination || pagination.total === 0) {
      return '';
    }
    const start = (pagination.page - 1) * pagination.page_size + 1;
    const end = Math.min(pagination.page * pagination.page_size, pagination.total);
    return this.i18n.t('teams.pageRange', {
      start,
      end,
      total: pagination.total,
    });
  });

  protected readonly errorMessage = computed(() => {
    const error = this.error();
    return error ? teamErrorMessage(this.i18n, error) : '';
  });

  protected readonly emptyTitle = computed<TranslationKey>(() =>
    this.hasFilters() ? 'teams.emptyFiltered' : 'teams.empty',
  );

  protected readonly emptyHint = computed<TranslationKey>(() =>
    this.hasFilters() ? 'teams.emptyFilteredHint' : 'teams.emptyHint',
  );

  /* ----------------------- Gestores de eventos (só leitura) ---------------------- */

  protected readonly managers = this.workspace.teamMembers;

  protected readonly managerStats = computed(() => {
    const managers = this.managers();
    return {
      managers: managers.length,
      events: new Set(managers.map((manager) => manager.eventId)).size,
      accounts: managers.filter((manager) => manager.hasAccount).length,
    };
  });

  protected readonly managerGroups = computed<ManagerGroup[]>(() => {
    const term = this.managerSearch().trim().toLocaleLowerCase(this.i18n.locale());
    const byEvent = new Map<string, TeamManager[]>();

    for (const member of this.managers()) {
      const list = byEvent.get(member.eventId) ?? [];
      list.push(member);
      byEvent.set(member.eventId, list);
    }

    return [...byEvent.entries()]
      .map(([eventId, members]) => {
        const event = this.workspace.eventById(eventId);
        const summary = members[0].event;
        return {
          eventId,
          title: event?.title ?? summary.title,
          startsAt: event?.startsAt ?? summary.startsAt,
          status: event?.status ?? summary.status,
          timezone: event?.timezone ?? 'Africa/Luanda',
          members: [...members].sort((a, b) => a.email.localeCompare(b.email)),
        } satisfies ManagerGroup;
      })
      .filter(
        (group) =>
          !term ||
          group.title.toLocaleLowerCase(this.i18n.locale()).includes(term) ||
          group.members.some((member) =>
            member.email.toLocaleLowerCase(this.i18n.locale()).includes(term),
          ),
      )
      .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));
  });

  protected readonly managerErrorMessage = computed(() => {
    const error = this.workspace.teamError();
    return error ? teamErrorMessage(this.i18n, error) : '';
  });

  constructor() {
    const initial = teamFiltersFromParams(this.route.snapshot.queryParamMap);
    this.filters.set(initial);
    this.searchInput.set(initial.q);
    this.tab.set(this.tabFromParams(this.route.snapshot.queryParamMap));

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const next = teamFiltersFromParams(params);
      const nextTab = this.tabFromParams(params);
      const filtersChanged = !sameTeamFilters(next, this.filters());
      const tabChanged = nextTab !== this.tab();
      if (!filtersChanged && !tabChanged) {
        return;
      }
      this.filters.set(next);
      this.searchInput.set(next.q);
      this.tab.set(nextTab);
      if (nextTab === 'managers') {
        void this.loadManagers();
      } else if (filtersChanged || tabChanged) {
        this.load();
      }
    });

    if (this.tab() === 'managers') {
      void this.loadManagers();
    } else {
      this.load();
    }

    this.destroyRef.onDestroy(() => {
      if (this.debounce !== null) {
        clearTimeout(this.debounce);
      }
    });
  }

  protected setTab(tab: TeamTab): void {
    if (this.tab() === tab) {
      return;
    }
    this.tab.set(tab);
    this.syncUrl(this.filters(), tab);
    if (tab === 'managers') {
      void this.loadManagers();
    } else {
      this.load();
    }
  }

  protected setManagerSearch(value: string): void {
    this.managerSearch.set(value);
  }

  protected setSearch(value: string): void {
    this.searchInput.set(value);
    if (this.debounce !== null) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => {
      this.debounce = null;
      const q = value.trim();
      if (q === this.filters().q.trim()) {
        return;
      }
      this.applyFilters({ ...this.filters(), q, page: 1 });
    }, SEARCH_DEBOUNCE_MS);
  }

  protected setRole(value: string): void {
    this.applyFilters({ ...this.filters(), role: value as TeamRoleFilter, page: 1 });
  }

  protected setEventStatus(value: string): void {
    this.applyFilters({
      ...this.filters(),
      eventStatus: value as TeamEventStatusFilter,
      page: 1,
    });
  }

  protected setCategory(value: string): void {
    this.applyFilters({
      ...this.filters(),
      category: value as TeamCategoryFilter,
      page: 1,
    });
  }

  protected setEvent(value: string): void {
    this.eventSearch.set('');
    this.applyFilters({ ...this.filters(), eventId: value, page: 1 });
  }

  protected setEventSearch(value: string): void {
    this.eventSearch.set(value);
  }

  protected setMine(value: boolean): void {
    this.applyFilters({ ...this.filters(), mine: value, page: 1 });
  }

  protected removeChip(id: FilterChip['id']): void {
    const filters = this.filters();
    switch (id) {
      case 'q':
        this.searchInput.set('');
        this.applyFilters({ ...filters, q: '', page: 1 });
        return;
      case 'role':
        this.applyFilters({ ...filters, role: 'all', page: 1 });
        return;
      case 'eventStatus':
        this.applyFilters({ ...filters, eventStatus: 'all', page: 1 });
        return;
      case 'category':
        this.applyFilters({ ...filters, category: 'all', page: 1 });
        return;
      case 'event':
        this.eventSearch.set('');
        this.applyFilters({ ...filters, eventId: '', page: 1 });
        return;
      case 'mine':
        this.applyFilters({ ...filters, mine: false, page: 1 });
    }
  }

  protected clearFilters(): void {
    this.searchInput.set('');
    this.eventSearch.set('');
    this.applyFilters({ ...DEFAULT_TEAM_FILTERS });
  }

  protected goToPage(page: number): void {
    const pagination = this.pagination();
    if (!pagination || page < 1 || page > pagination.total_pages || page === pagination.page) {
      return;
    }
    this.applyFilters({ ...this.filters(), page });
  }

  protected retry(): void {
    void this.store.refresh();
  }

  protected openCreate(): void {
    this.formTeam.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    if (!this.formSaving()) {
      this.formOpen.set(false);
    }
  }

  protected async saveTeam(value: TeamFormValue): Promise<void> {
    if (this.formSaving()) {
      return;
    }
    this.formSaving.set(true);
    try {
      const editing = this.formTeam();
      const team = editing
        ? await this.repository.update(editing.id, {
            name: value.name,
            category: value.category,
            description: value.description,
          })
        : await this.repository.create(value);
      this.store.upsert(team);
      this.formOpen.set(false);
      this.toasts.success(this.i18n.t(editing ? 'teams.form.updated' : 'teams.form.created'));
      if (!editing) {
        await this.router.navigate(['/equipas', team.id]);
      }
    } catch (error: unknown) {
      this.toasts.error(teamErrorMessage(this.i18n, toApiError(error)));
    } finally {
      this.formSaving.set(false);
    }
  }

  protected roleLabel(role: TeamMyRole): string {
    return this.i18n.t(this.roleLabelKey(role));
  }

  protected categoryLabel(category: TeamCategory): string {
    return this.i18n.t(this.categoryLabelKey(category));
  }

  protected eventStatusLabel(status: TeamEventStatus): string {
    return this.i18n.t(this.statusLabelKey(status));
  }

  protected memberLabel(team: Team): string {
    return team.memberCount === 1
      ? this.i18n.t('teams.memberCountOne')
      : this.i18n.t('teams.memberCount', { count: team.memberCount });
  }

  protected openTasksLabel(team: Team): string {
    if (team.openTaskCount === 0) {
      return this.i18n.t('teams.openTasksNone');
    }
    return team.openTaskCount === 1
      ? this.i18n.t('teams.openTasksOne')
      : this.i18n.t('teams.openTasks', { count: team.openTaskCount });
  }

  protected progressLabel(team: Team): string {
    return this.i18n.t('teams.progress', {
      completed: team.completedTaskCount,
      total: team.taskCount,
    });
  }

  protected progressPercent(team: Team): number {
    return team.taskCount > 0
      ? Math.round((team.completedTaskCount / team.taskCount) * 100)
      : 0;
  }

  protected previewNames(team: Team): string[] {
    return team.membersPreview.map(
      (member) => member.displayName ?? this.i18n.t('teams.previewFallback'),
    );
  }

  protected previewImages(team: Team): Array<string | null> {
    return team.membersPreview.map((member) => member.avatarUrl);
  }

  private tabFromParams(params: ParamMap): TeamTab {
    return params.get('tab') === 'gestores' ? 'managers' : 'teams';
  }

  private queryFor(filters: TeamFilters, tab: TeamTab): Record<string, unknown> {
    return {
      ...this.route.snapshot.queryParams,
      ...teamFiltersToParams(filters),
      tab: tab === 'managers' ? 'gestores' : null,
    };
  }

  private syncUrl(filters: TeamFilters, tab: TeamTab): void {
    void this.router.navigate(['/equipas'], {
      queryParams: this.queryFor(filters, tab),
      replaceUrl: true,
    });
  }

  private applyFilters(filters: TeamFilters): void {
    this.filters.set(filters);
    this.syncUrl(filters, this.tab());
    if (this.tab() === 'managers') {
      void this.loadManagers();
    } else {
      this.load();
    }
  }

  private load(): void {
    void this.store.load(teamFiltersToQuery(this.filters(), PAGE_SIZE));
  }

  private async loadManagers(): Promise<void> {
    this.managersLoading.set(true);
    try {
      await this.workspace.reloadTeam();
    } catch (error: unknown) {
      // O erro fica no WorkspaceStore e é mostrado no separador.
      void error;
    } finally {
      this.managersLoading.set(false);
    }
  }

  private roleLabelKey(role: TeamMyRole): TranslationKey {
    return `teamRole.${role}` as TranslationKey;
  }

  private statusLabelKey(status: TeamEventStatus): TranslationKey {
    return `status.${status}` as TranslationKey;
  }

  private categoryLabelKey(category: TeamCategory): TranslationKey {
    return `teamCategory.${category}` as TranslationKey;
  }
}
