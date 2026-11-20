import { computed, Injectable, inject, signal } from '@angular/core';
import { ApiError } from '../api/api-error';
import { emptyProfile, mapEvent, statsForEvents, statsForGuests } from '../api/mappers';
import {
  AddGuestResult,
  CreateEventInput,
  EventAccessRole,
  EventActivity,
  EventManager,
  EventStats,
  EventTemplate,
  Guest,
  GuestInput,
  HostEvent,
  HostNotification,
  HostProfile,
  ManagerInviteResult,
  TeamManager,
  TemplateId,
  WorkspaceTask,
} from '../models/models';
import { ActivityRepository } from '../data/activity.repository';
import { CachedRepository, LoadOptions } from '../data/cached-repository';
import { DashboardRepository } from '../data/dashboard.repository';
import { EventsRepository } from '../data/events.repository';
import { GuestPage, GuestsQuery, GuestsRepository } from '../data/guests.repository';
import { ManagementStore } from '../data/management.store';
import {
  NotificationPage,
  NotificationQuery,
  NotificationsRepository,
} from '../data/notifications.repository';
import { ProfileRepository, ProfileUpdateInput } from '../data/profile.repository';
import { ReportsRepository } from '../data/reports.repository';
import { TasksRepository } from '../data/tasks.repository';
import { TaskPage, TaskQuery } from '../data/tasks.repository';
import { TeamRepository } from '../data/team.repository';
import { TemplateSelectionStore } from '../data/template-selection.store';
import { TemplatesRepository } from '../data/templates.repository';
import { Resettable, SessionCache } from './session-cache';

/**
 * Domínios que uma página pode pedir. A shell acrescenta sempre o "chrome"
 * (perfil, atividade e eventos), que alimenta a navegação e as notificações.
 */
export interface LoadScope {
  events?: boolean;
  guests?: boolean;
  activity?: boolean;
  tasks?: boolean;
  templates?: boolean;
  dashboard?: boolean;
  reports?: boolean;
  profile?: boolean;
  notifications?: boolean;
  team?: boolean;
}

const CHROME_SCOPE: LoadScope = {
  profile: true,
  activity: true,
  events: true,
  notifications: true,
};

/**
 * Fachada sem estado sobre os repositórios por domínio.
 *
 * Deixa de guardar dados próprios: todos os signals são derivados dos
 * repositórios (`core/data/*`), que se registam no `SessionCache` e são
 * limpos no logout/novo login. Cada página declara o que precisa via
 * `load(scope)` e só esses pedidos são feitos.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceStore implements Resettable {
  private readonly eventsRepo = inject(EventsRepository);
  private readonly guestsRepo = inject(GuestsRepository);
  private readonly activityRepo = inject(ActivityRepository);
  private readonly tasksRepo = inject(TasksRepository);
  private readonly notificationsRepo = inject(NotificationsRepository);
  private readonly templatesRepo = inject(TemplatesRepository);
  private readonly dashboardRepo = inject(DashboardRepository);
  private readonly reportsRepo = inject(ReportsRepository);
  private readonly teamRepo = inject(TeamRepository);
  private readonly profileRepo = inject(ProfileRepository);
  private readonly management = inject(ManagementStore);
  private readonly templateSelection = inject(TemplateSelectionStore);
  private readonly sessions = inject(SessionCache);

  /** Domínios atualmente "ativos" (chrome + última página). */
  private readonly activeScope = signal<LoadScope>({ ...CHROME_SCOPE });

  /** Gestores por evento, carregados a pedido do painel de equipa. */
  private readonly managersState = signal<Record<string, EventManager[]>>({});

  constructor() {
    this.sessions.register(this);
  }

  readonly events = computed<HostEvent[]>(() => this.eventsRepo.data() ?? []);
  readonly guests = computed<Guest[]>(() => this.guestsRepo.data() ?? []);
  readonly activity = computed<EventActivity[]>(() => this.activityRepo.data() ?? []);
  readonly tasks = computed<WorkspaceTask[]>(() => this.tasksRepo.data() ?? []);
  readonly notifications = computed<HostNotification[]>(() => this.notificationsRepo.data() ?? []);
  readonly unreadNotifications = this.notificationsRepo.unreadCount;
  readonly templates = computed<EventTemplate[]>(() => this.templatesRepo.data() ?? []);
  readonly reportSummary = computed(() => this.reportsRepo.data());
  readonly teamMembers = computed<TeamManager[]>(() => this.teamRepo.data() ?? []);
  readonly teamLoading = this.teamRepo.loading;
  readonly teamError = this.teamRepo.error;
  readonly profile = computed<HostProfile>(() => this.profileRepo.data() ?? emptyProfile());

  readonly manageEmailStatus = this.management.manageEmailStatus;
  readonly activeManagementEventId = this.management.activeEventId;
  readonly managementRole = this.management.role;
  readonly selectedTemplate = this.templateSelection.selected;

  /** `true` enquanto qualquer domínio ativo está a carregar. */
  readonly loading = computed(() =>
    this.repositoriesFor(this.activeScope()).some((repository) => repository.loading()),
  );

  /** Primeiro erro entre os domínios ativos, para o ecrã de recuperação da shell. */
  readonly error = computed<ApiError | null>(() => {
    for (const repository of this.repositoriesFor(this.activeScope())) {
      const error = repository.error();
      if (error) {
        return error;
      }
    }
    return null;
  });

  readonly activeEvents = computed(() =>
    this.events().filter((event) => event.status === 'published'),
  );

  readonly upcomingEvents = computed(() =>
    this.activeEvents()
      .filter((event) => event.startsAt && new Date(event.startsAt).getTime() >= Date.now())
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
  );

  readonly nextEvent = computed<HostEvent | null>(() => {
    const next = this.dashboardRepo.data()?.next_event;
    return next ? mapEvent(next) : (this.upcomingEvents()[0] ?? null);
  });

  readonly recentEvents = computed(() =>
    [...this.events()]
      .filter((event) => event.status !== 'cancelled')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4),
  );

  readonly globalStats = computed<
    EventStats & { events: number; drafts: number; completed: number }
  >(() => {
    const totals = this.dashboardRepo.data()?.totals;
    if (totals) {
      return {
        events: totals.scheduled,
        drafts: totals.drafts,
        completed: totals.completed,
        total: totals.total_invitations,
        confirmed: totals.accepted,
        pending: totals.pending,
        declined: totals.declined,
        responseRate: totals.total_invitations
          ? Math.round(((totals.accepted + totals.declined) / totals.total_invitations) * 100)
          : 0,
      };
    }
    return statsForEvents(this.events());
  });

  readonly guestsWithEvent = computed(() => {
    const events = this.events();
    return this.guests()
      .map((guest) => ({
        guest,
        event: events.find((event) => event.id === guest.eventId) ?? null,
      }))
      .filter((entry): entry is { guest: Guest; event: HostEvent } => entry.event !== null);
  });

  readonly pendingGuests = computed(() =>
    this.guestsWithEvent()
      .filter((entry) => entry.guest.status === 'pending')
      .sort((a, b) => new Date(a.event.startsAt).getTime() - new Date(b.event.startsAt).getTime()),
  );

  readonly activityFeed = computed(() =>
    [...this.activity()]
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((item) => ({
        item,
        event: this.events().find((event) => event.id === item.eventId) ?? null,
      }))
      .filter((entry): entry is { item: EventActivity; event: HostEvent } => entry.event !== null),
  );

  readonly managementEvent = computed<HostEvent | null>(() => {
    const id = this.activeManagementEventId();
    return id ? (this.eventsRepo.eventById(id) ?? null) : null;
  });

  readonly taskProgress = computed(() => {
    const tasks = this.tasks();
    return {
      done: tasks.filter((task) => task.done).length,
      total: tasks.length,
    };
  });

  /**
   * Declara os domínios que a página atual precisa e dispara os pedidos em
   * falta. O "chrome" (perfil, atividade, eventos) é sempre incluído.
   */
  load(scope: LoadScope = {}): void {
    const merged: LoadScope = { ...CHROME_SCOPE, ...scope };
    this.activeScope.set(merged);
    void this.runScope(merged);
  }

  /** Compatibilidade com o carregamento inicial da shell. */
  ensureLoaded(): void {
    this.load({});
  }

  /**
   * Carrega convidados e tarefas em segundo plano para a pesquisa global,
   * sem alterar o `activeScope` (não dispara o ecrã de carregamento da shell).
   * Os repositórios deduplicam e respeitam o TTL, pelo que é seguro repetir.
   */
  warmSearch(): void {
    void Promise.allSettled([this.guestsRepo.load(), this.tasksRepo.load()]);
  }

  /** Recarrega com `force` os domínios ativos (usado no botão "tentar de novo"). */
  async retry(): Promise<void> {
    await this.runScope(this.activeScope(), { force: true });
  }

  eventById(id: string): HostEvent | null {
    return this.eventsRepo.eventById(id);
  }

  guestsFor(eventId: string): Guest[] {
    return this.guestsRepo.forEvent(eventId);
  }

  eventStats(eventId: string): EventStats {
    const event = this.eventById(eventId);
    if (event?.stats) {
      return event.stats;
    }
    return statsForGuests(this.guestsFor(eventId));
  }

  activityFor(eventId: string): EventActivity[] {
    return this.activity()
      .filter((item) => item.eventId === eventId)
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  /** Atividade de um evento, paginada no servidor. */
  listEventActivity(eventId: string, page = 1, pageSize = 10) {
    return this.activityRepo.listForEvent(eventId, page, pageSize);
  }

  tasksFor(eventId: string): WorkspaceTask[] {
    return this.tasks().filter((task) => task.eventId === eventId);
  }

  setActiveManagement(eventId: string | null): void {
    this.management.setActive(eventId);
  }

  async openManagementLink(token: string): Promise<HostEvent> {
    return this.management.open(token);
  }

  async endManagement(eventId: string): Promise<void> {
    await this.management.end(eventId);
  }

  async createEvent(input: CreateEventInput): Promise<HostEvent> {
    const { event, manageEmailStatus } = await this.eventsRepo.create(input);
    this.management.setManageEmailStatus(manageEmailStatus);
    // O servidor passa a listar o evento e os convidados criados. Refresca os
    // convidados para que as estatísticas do evento recém-criado fiquem certas
    // e invalida os totais agregados.
    await Promise.allSettled([this.guestsRepo.load({ force: true })]);
    this.dashboardRepo.invalidate();
    this.reportsRepo.invalidate();
    return this.eventsRepo.eventById(event.id) ?? event;
  }

  async updateEvent(
    eventId: string,
    patch: Partial<
      Pick<HostEvent, 'title' | 'venue' | 'city' | 'message' | 'rules' | 'dressCode' | 'status'>
    >,
  ): Promise<HostEvent | null> {
    const updated = await this.eventsRepo.update(eventId, patch);
    if (updated) {
      this.dashboardRepo.invalidate();
      this.reportsRepo.invalidate();
    }
    return updated;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.eventsRepo.remove(eventId);
    this.guestsRepo.removeForEvent(eventId);
    this.dashboardRepo.invalidate();
    this.reportsRepo.invalidate();
  }

  async resendManageLink(eventId: string): Promise<'queued' | 'failed'> {
    return this.eventsRepo.resendManageLink(eventId);
  }

  /**
   * Papel de quem está a gerir o evento: a sessão por link tem prioridade
   * (pode ser de um gestor sem conta), senão usa o `accessRole` da lista.
   */
  accessRoleFor(eventId: string): EventAccessRole {
    if (this.activeManagementEventId() === eventId) {
      return this.management.role() ?? 'host';
    }
    return this.eventById(eventId)?.accessRole ?? 'host';
  }

  /** `true` quando a sessão atual pode executar ações reservadas ao anfitrião. */
  isEventHost(eventId: string): boolean {
    return this.accessRoleFor(eventId) === 'host';
  }

  managersFor(eventId: string): EventManager[] {
    return this.managersState()[eventId] ?? [];
  }

  async loadManagers(eventId: string): Promise<EventManager[]> {
    const managers = await this.eventsRepo.listManagers(eventId);
    this.setManagers(eventId, managers);
    return managers;
  }

  async addManager(eventId: string, email: string): Promise<ManagerInviteResult> {
    const result = await this.eventsRepo.addManager(eventId, email);
    this.setManagers(eventId, upsertManager(this.managersFor(eventId), result.manager));
    // O backend inclui automaticamente o gestor na lista de convidados
    // quando ainda não existia; os totais deixam de estar atualizados.
    this.guestsRepo.invalidate();
    this.dashboardRepo.invalidate();
    this.reportsRepo.invalidate();
    return result;
  }

  async removeManager(eventId: string, managerId: string): Promise<void> {
    await this.eventsRepo.removeManager(eventId, managerId);
    this.setManagers(
      eventId,
      this.managersFor(eventId).filter((manager) => manager.id !== managerId),
    );
  }

  async resendManagerInvite(eventId: string, managerId: string): Promise<ManagerInviteResult> {
    const result = await this.eventsRepo.resendManagerInvite(eventId, managerId);
    this.setManagers(eventId, upsertManager(this.managersFor(eventId), result.manager));
    return result;
  }

  /** Adiciona um gestor a partir da página global de equipas. */
  async addTeamManager(eventId: string, email: string): Promise<ManagerInviteResult> {
    const result = await this.addManager(eventId, email);
    this.teamRepo.invalidate();
    return result;
  }

  /** Remove o acesso de um gestor a partir da página global de equipas. */
  async removeTeamManager(eventId: string, managerId: string): Promise<void> {
    await this.removeManager(eventId, managerId);
    this.teamRepo.invalidate();
  }

  /** Reenvia o convite de gestão a partir da página global de equipas. */
  async resendTeamManagerInvite(
    eventId: string,
    managerId: string,
  ): Promise<ManagerInviteResult> {
    const result = await this.resendManagerInvite(eventId, managerId);
    this.teamRepo.invalidate();
    return result;
  }

  /** Recarrega a equipa global, ignorando o cache. */
  async reloadTeam(): Promise<TeamManager[]> {
    return this.teamRepo.load({ force: true });
  }

  private setManagers(eventId: string, managers: EventManager[]): void {
    this.managersState.update((state) => ({ ...state, [eventId]: managers }));
  }

  /** Listagem paginada e filtrada no servidor, usada por convidados e detalhe do evento. */
  guestsPage(query: GuestsQuery = {}): Promise<GuestPage> {
    return this.guestsRepo.listPage(query);
  }

  async addGuest(eventId: string, input: GuestInput): Promise<AddGuestResult> {
    return this.guestsRepo.add(eventId, input);
  }

  async updateGuest(guest: Guest, input: GuestInput): Promise<Guest> {
    return this.guestsRepo.update(guest, input);
  }

  async removeGuest(guestId: string): Promise<void> {
    await this.guestsRepo.remove(guestId);
  }

  async sendReminder(guestId: string): Promise<boolean> {
    return this.guestsRepo.sendReminder(guestId);
  }

  async toggleTask(taskId: string, done?: boolean): Promise<void> {
    await this.tasksRepo.toggle(taskId, done);
  }

  /** Listagem paginada e filtrada usada pela página global de tarefas. */
  tasksPage(query: TaskQuery = {}): Promise<TaskPage> {
    return this.tasksRepo.listPage(query);
  }

  async createTask(
    label: string,
    eventId: string | null = null,
    managerId: string | null = null,
  ): Promise<WorkspaceTask> {
    return this.tasksRepo.create(label, eventId, managerId);
  }

  async removeTask(taskId: string): Promise<void> {
    await this.tasksRepo.remove(taskId);
  }

  async setEventCoverUrl(eventId: string, coverUrl: string): Promise<HostEvent> {
    return this.eventsRepo.setCoverUrl(eventId, coverUrl);
  }

  uploadEventCover(
    eventId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): { promise: Promise<HostEvent>; cancel: () => void } {
    return this.eventsRepo.uploadCover(eventId, file, onProgress);
  }

  async removeEventCover(eventId: string): Promise<HostEvent> {
    return this.eventsRepo.removeCover(eventId);
  }

  async removeActivity(eventId: string, activityId: string): Promise<void> {
    await this.activityRepo.remove(eventId, activityId);
  }

  /** Listagem paginada e filtrada usada pela página de notificações. */
  notificationsPage(query: NotificationQuery = {}): Promise<NotificationPage> {
    return this.notificationsRepo.listPage(query);
  }

  async markNotificationRead(notificationId: string, read = true): Promise<void> {
    await this.notificationsRepo.setRead(notificationId, read);
  }

  async removeNotification(notificationId: string): Promise<void> {
    await this.notificationsRepo.remove(notificationId);
  }

  async readAllNotifications(): Promise<void> {
    await this.notificationsRepo.readAll();
  }

  async removeAllNotifications(): Promise<void> {
    await this.notificationsRepo.removeAll();
  }

  async refreshNotifications(): Promise<void> {
    await this.notificationsRepo.load({ force: true });
  }

  async saveProfile(input: ProfileUpdateInput): Promise<HostProfile> {
    return this.profileRepo.save(input);
  }

  async setAvatarUrl(avatarUrl: string): Promise<HostProfile> {
    return this.profileRepo.setAvatarUrl(avatarUrl);
  }

  async uploadAvatar(file: File): Promise<HostProfile> {
    return this.profileRepo.uploadAvatar(file);
  }

  async removeAvatar(): Promise<HostProfile> {
    return this.profileRepo.removeAvatar();
  }

  async setCoverUrl(coverUrl: string): Promise<HostProfile> {
    return this.profileRepo.setCoverUrl(coverUrl);
  }

  async uploadCover(file: File): Promise<HostProfile> {
    return this.profileRepo.uploadCover(file);
  }

  async removeCover(): Promise<HostProfile> {
    return this.profileRepo.removeCover();
  }

  /** Seleciona o modelo ativo (partilhado com o assistente de criação). */
  selectTemplate(id: TemplateId | null): void {
    this.templateSelection.select(id);
  }

  reset(): void {
    this.managersState.set({});
  }

  private async runScope(scope: LoadScope, options: LoadOptions = {}): Promise<void> {
    const requests: Promise<unknown>[] = [];
    if (scope.profile) requests.push(this.profileRepo.load(options));
    if (scope.activity) requests.push(this.activityRepo.load(options));
    if (scope.events) requests.push(this.eventsRepo.load(options));
    if (scope.guests) requests.push(this.guestsRepo.load(options));
    if (scope.tasks) requests.push(this.tasksRepo.load(options));
    if (scope.notifications) requests.push(this.notificationsRepo.load(options));
    if (scope.templates) requests.push(this.templatesRepo.load(options));
    if (scope.dashboard) requests.push(this.dashboardRepo.load(options));
    if (scope.reports) requests.push(this.reportsRepo.load(options));
    if (scope.team) requests.push(this.teamRepo.load(options));
    // Cada repositório guarda o seu próprio erro; não propagamos rejeições.
    await Promise.allSettled(requests);
  }

  private repositoriesFor(scope: LoadScope): CachedRepository<unknown>[] {
    const repositories: CachedRepository<unknown>[] = [];
    if (scope.profile) repositories.push(this.profileRepo);
    if (scope.activity) repositories.push(this.activityRepo);
    if (scope.events) repositories.push(this.eventsRepo);
    if (scope.guests) repositories.push(this.guestsRepo);
    if (scope.tasks) repositories.push(this.tasksRepo);
    if (scope.notifications) repositories.push(this.notificationsRepo);
    if (scope.templates) repositories.push(this.templatesRepo);
    if (scope.dashboard) repositories.push(this.dashboardRepo);
    if (scope.reports) repositories.push(this.reportsRepo);
    if (scope.team) repositories.push(this.teamRepo);
    return repositories;
  }
}

/** Insere ou substitui um gestor mantendo a ordem estável da lista. */
function upsertManager(managers: EventManager[], manager: EventManager): EventManager[] {
  return managers.some((item) => item.id === manager.id)
    ? managers.map((item) => (item.id === manager.id ? manager : item))
    : [...managers, manager];
}
