import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { teamErrorMessage } from '../../core/i18n/team-errors';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
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
import { Team, TeamCategory, TeamEventStatus, TeamMyRole } from '../../core/models/models';
import { TeamsStore } from '../../core/services/teams.store';
import { ICONS } from '../../core/ui/icons';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

interface FilterChip {
  id: 'q' | 'role' | 'eventStatus' | 'category' | 'mine';
  label: string;
}

interface SelectOption<T extends string> {
  id: T;
  labelKey: TranslationKey;
}

/**
 * Lista global de equipas (`/equipas`).
 *
 * Os filtros são aplicados no servidor e sincronizados com o URL, para
 * que uma ligação partilhada reabra exatamente a mesma vista. O estado
 * dos filtros vive em signals; a lista em `TeamsStore` (limpa no logout).
 */
@Component({
  selector: 'app-team-page',
  imports: [
    RouterLink,
    FaIconComponent,
    SkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './team.page.html',
})
export class TeamPage {
  private readonly store = inject(TeamsStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  protected readonly filters = signal<TeamFilters>({ ...DEFAULT_TEAM_FILTERS });
  protected readonly searchInput = signal('');

  protected readonly items = this.store.items;
  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;
  protected readonly pagination = this.store.pagination;

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

  constructor() {
    const initial = teamFiltersFromParams(this.route.snapshot.queryParamMap);
    this.filters.set(initial);
    this.searchInput.set(initial.q);

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const next = teamFiltersFromParams(params);
      if (sameTeamFilters(next, this.filters())) {
        return;
      }
      this.filters.set(next);
      this.searchInput.set(next.q);
      this.load();
    });

    this.load();

    this.destroyRef.onDestroy(() => {
      if (this.debounce !== null) {
        clearTimeout(this.debounce);
      }
    });
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
      case 'mine':
        this.applyFilters({ ...filters, mine: false, page: 1 });
    }
  }

  protected clearFilters(): void {
    this.searchInput.set('');
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

  private applyFilters(filters: TeamFilters): void {
    this.filters.set(filters);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: teamFiltersToParams(filters),
      replaceUrl: true,
    });
    this.load();
  }

  private load(): void {
    void this.store.load(teamFiltersToQuery(this.filters(), PAGE_SIZE));
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
