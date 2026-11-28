import { inject, Injectable, signal } from '@angular/core';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { AuthService } from '../api/auth.service';
import { I18nService } from '../i18n/i18n.service';
import { TranslationKey } from '../i18n/translations';
import { EventsRepository } from '../data/events.repository';
import { GuestsRepository } from '../data/guests.repository';
import { ICONS } from '../ui/icons';
import { NotificationPresenter } from '../../shared/services/notification.presenter';
import { Resettable, SessionCache } from './session-cache';
import { WorkspaceStore } from './workspace.store';

/** Máximo de itens por categoria para manter a lista curta em mobile. */
const MAX_PER_GROUP = 4;
/** Limite pedido à API quando a store não tem resultados suficientes. */
const MAX_REMOTE = 5;
const MAX_RECENTS = 5;
const MAX_UPCOMING = 3;
const MAX_RECENT_GUESTS = 3;
const RECENTS_KEY = 'apupu.search.recents';

const SHORTCUT_PATHS = ['/convidados', '/equipas', '/tarefas', '/criar-evento'];

export interface SearchSuggestion {
  /** Identificador estável para `track` e navegação por teclado. */
  id: string;
  label: string;
  meta: string;
  icon: IconDefinition;
  route: string[];
  queryParams?: Record<string, string>;
  /** Quando presente, a notificação é marcada como lida ao escolher. */
  notificationId?: string;
}

export interface SearchGroup {
  key: string;
  labelKey: TranslationKey;
  items: SearchSuggestion[];
}

interface PageShortcut {
  labelKey: TranslationKey;
  path: string;
  icon: IconDefinition;
}

/**
 * Pesquisa global da shell.
 *
 * Constrói sugestões a partir dos dados já carregados (eventos, notificações e
 * páginas) e, depois de `warm()`, também de convidados e tarefas. Com o campo
 * vazio mostra apenas dados da store e atalhos; ao escrever, a shell pede
 * também resultados à API (5 por grupo) e ignora respostas antigas. A pesquisa
 * é insensível a maiúsculas e acentos.
 */
@Injectable({ providedIn: 'root' })
export class SearchService implements Resettable {
  private readonly store = inject(WorkspaceStore);
  private readonly i18n = inject(I18nService);
  private readonly notifications = inject(NotificationPresenter);
  private readonly sessions = inject(SessionCache);
  private readonly auth = inject(AuthService);
  private readonly guestsRepository = inject(GuestsRepository);
  private readonly eventsRepository = inject(EventsRepository);

  /** `true` depois do primeiro `warm()`, para não repetir pedidos. */
  private warmed = false;
  private readonly recentRevisionState = signal(0);

  /** Reativo para os painéis de sugestões reagirem a limpar/guardar recentes. */
  readonly recentRevision = this.recentRevisionState.asReadonly();

  constructor() {
    this.sessions.register(this);
  }

  /**
   * Esquece o aquecimento quando a sessão muda, para a próxima pesquisa voltar
   * a carregar convidados/tarefas do novo anfitrião.
   */
  reset(): void {
    this.warmed = false;
    this.recentRevisionState.update((value) => value + 1);
  }

  private readonly pages: PageShortcut[] = [
    { labelKey: 'nav.dashboard', path: '/painel', icon: ICONS['dashboard'] },
    { labelKey: 'nav.events', path: '/eventos', icon: ICONS['events'] },
    { labelKey: 'nav.guests', path: '/convidados', icon: ICONS['guests'] },
    { labelKey: 'nav.tasks', path: '/tarefas', icon: ICONS['checklist'] },
    { labelKey: 'nav.invites', path: '/convites', icon: ICONS['envelope'] },
    { labelKey: 'nav.team', path: '/equipas', icon: ICONS['guestGroup'] },
    { labelKey: 'nav.templates', path: '/templates', icon: ICONS['templates'] },
    { labelKey: 'nav.reports', path: '/relatorios', icon: ICONS['reports'] },
    { labelKey: 'nav.notifications', path: '/notificacoes', icon: ICONS['bell'] },
    { labelKey: 'nav.profile', path: '/perfil', icon: ICONS['user'] },
    { labelKey: 'nav.settings', path: '/definicoes', icon: ICONS['settings'] },
    { labelKey: 'shell.newEvent', path: '/criar-evento', icon: ICONS['plus'] },
  ];

  /**
   * Aquece convidados e tarefas para as sugestões. Corre **uma só vez por
   * sessão**: dispara no máximo 2 GETs (`/host/guests` e `/host/tasks`) na
   * primeira abertura da pesquisa; focos e teclas seguintes não fazem pedidos.
   * O `reset()` volta a permitir o aquecimento quando a sessão muda.
   */
  warm(): void {
    if (this.warmed) {
      return;
    }
    this.warmed = true;
    this.store.warmSearch();
  }

  /** Sugestões com o campo vazio, todas a partir de dados já carregados. */
  browse(): SearchGroup[] {
    const groups: SearchGroup[] = [];
    const recents = this.recentSearches().map((term) => ({
      id: `recent:${term}`,
      label: term,
      meta: '',
      icon: ICONS['history'],
      route: ['/convidados'],
      queryParams: { q: term },
    }));
    if (recents.length) {
      groups.push({ key: 'recents', labelKey: 'search.groupRecent', items: recents });
    }

    const events = [...this.store.events()]
      .filter((event) => event.status !== 'completed' && event.status !== 'cancelled')
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, MAX_UPCOMING)
      .map((event) => ({
        id: `event:${event.id}`,
        label: event.title,
        meta: event.city || event.venue || '',
        icon: ICONS['events'],
        route: ['/eventos', event.id],
      }));
    if (events.length) {
      groups.push({ key: 'events', labelKey: 'search.groupEvents', items: events });
    }

    const guests = this.store
      .guestsWithEvent()
      .slice(-MAX_RECENT_GUESTS)
      .reverse()
      .map(({ guest, event }) => ({
        id: `guest:${guest.id}`,
        label: guest.name,
        meta: event.title,
        icon: ICONS['guests'],
        route: ['/convidados'],
        queryParams: { q: guest.name },
      }));
    if (guests.length) {
      groups.push({ key: 'guests', labelKey: 'search.groupGuests', items: guests });
    }

    const shortcuts = this.pages
      .filter((page) => SHORTCUT_PATHS.includes(page.path))
      .sort((a, b) => SHORTCUT_PATHS.indexOf(a.path) - SHORTCUT_PATHS.indexOf(b.path))
      .map((page) => ({
        id: `page:${page.path}`,
        label: this.i18n.t(page.labelKey),
        meta: '',
        icon: page.icon,
        route: [page.path],
      }));
    if (shortcuts.length) {
      groups.push({ key: 'shortcuts', labelKey: 'search.groupShortcuts', items: shortcuts });
    }
    return groups;
  }

  /** Grupos de sugestões para o termo, por ordem de relevância. */
  suggest(term: string): SearchGroup[] {
    const query = this.normalize(term);
    if (!query) {
      return [];
    }

    const groups: SearchGroup[] = [];
    const guests = this.guestMatches(query);
    const events = this.eventMatches(query);
    const tasks = this.taskMatches(query);
    const notifications = this.notificationMatches(query);
    const pages = this.pageMatches(query);

    if (guests.length) {
      groups.push({ key: 'guests', labelKey: 'search.groupGuests', items: guests });
    }
    if (events.length) {
      groups.push({ key: 'events', labelKey: 'search.groupEvents', items: events });
    }
    if (tasks.length) {
      groups.push({ key: 'tasks', labelKey: 'search.groupTasks', items: tasks });
    }
    if (notifications.length) {
      groups.push({
        key: 'notifications',
        labelKey: 'search.groupNotifications',
        items: notifications,
      });
    }
    if (pages.length) {
      groups.push({ key: 'pages', labelKey: 'search.groupPages', items: pages });
    }
    return groups;
  }

  /**
   * Resultados remotos para um termo não vazio (máximo 5 por grupo). A shell
   * controla a sequência dos pedidos e ignora respostas que já não são atuais.
   */
  async searchRemote(term: string): Promise<SearchGroup[]> {
    const query = term.trim();
    if (!query) {
      return [];
    }
    const [guestPage, events] = await Promise.all([
      this.guestsRepository.listPage({ q: query, page: 1, page_size: MAX_REMOTE }),
      this.eventsRepository.search(query),
    ]);

    const groups: SearchGroup[] = [];
    const guests = guestPage.items.map(({ guest, event }) => ({
      id: `guest:${guest.id}`,
      label: guest.name,
      meta: event.title,
      icon: ICONS['guests'],
      route: ['/convidados'],
      queryParams: { q: guest.name },
    }));
    if (guests.length) {
      groups.push({ key: 'remote-guests', labelKey: 'search.groupGuests', items: guests });
    }
    const eventItems = events.map((event) => ({
      id: `event:${event.id}`,
      label: event.title,
      meta: event.city || event.venue || '',
      icon: ICONS['events'],
      route: ['/eventos', event.id],
    }));
    if (eventItems.length) {
      groups.push({ key: 'remote-events', labelKey: 'search.groupEvents', items: eventItems });
    }
    return groups;
  }

  /** Guarda apenas o texto pesquisado, nunca dados de convidados ou eventos. */
  rememberSearch(term: string): void {
    const value = term.trim();
    if (!value) {
      return;
    }
    const key = this.hostStorageKey();
    if (!key) {
      return;
    }
    const recents = this.recentSearches().filter(
      (item) => this.normalize(item) !== this.normalize(value),
    );
    try {
      localStorage.setItem(key, JSON.stringify([value, ...recents].slice(0, MAX_RECENTS)));
      this.recentRevisionState.update((revision) => revision + 1);
    } catch {
      // armazenamento indisponível (modo privado): a pesquisa continua a funcionar.
    }
  }

  clearRecentSearches(): void {
    const key = this.hostStorageKey();
    if (!key) {
      return;
    }
    try {
      localStorage.removeItem(key);
      this.recentRevisionState.update((revision) => revision + 1);
    } catch {
      // armazenamento indisponível: nada a limpar.
    }
  }

  /** Termos guardados para a pesquisa global (também usados no feed público). */
  recentSearches(): string[] {
    const key = this.hostStorageKey();
    if (!key) {
      return [];
    }
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string' && !!item.trim()).slice(0, MAX_RECENTS)
        : [];
    } catch {
      return [];
    }
  }

  private hostStorageKey(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const hostId = this.auth.host()?.id || this.store.profile().email || 'anonymous';
    return `${RECENTS_KEY}.${hostId}`;
  }

  private guestMatches(query: string): SearchSuggestion[] {
    return this.store
      .guestsWithEvent()
      .filter(({ guest }) => this.matches(query, guest.name, guest.email))
      .slice(0, MAX_PER_GROUP)
      .map(({ guest, event }) => ({
        id: `guest:${guest.id}`,
        label: guest.name,
        meta: event.title,
        icon: ICONS['guests'],
        route: ['/convidados'],
        queryParams: { q: guest.name },
      }));
  }

  private eventMatches(query: string): SearchSuggestion[] {
    return this.store
      .events()
      .filter((event) => this.matches(query, event.title, event.city, event.venue))
      .slice(0, MAX_PER_GROUP)
      .map((event) => ({
        id: `event:${event.id}`,
        label: event.title,
        meta: event.city || event.venue || '',
        icon: ICONS['events'],
        route: ['/eventos', event.id],
      }));
  }

  private taskMatches(query: string): SearchSuggestion[] {
    return this.store
      .tasks()
      .filter((task) => this.matches(query, task.label, task.eventTitle))
      .slice(0, MAX_PER_GROUP)
      .map((task) => ({
        id: `task:${task.id}`,
        label: task.label,
        meta: task.eventTitle ?? '',
        icon: ICONS['checklist'],
        route: ['/tarefas'],
        queryParams: { q: task.label },
      }));
  }

  private notificationMatches(query: string): SearchSuggestion[] {
    return this.store
      .notifications()
      .filter((notification) => this.matches(query, notification.title, notification.body))
      .slice(0, MAX_PER_GROUP)
      .map((notification) => ({
        id: `notification:${notification.id}`,
        label: notification.title,
        meta: notification.eventTitle ?? '',
        icon: this.notifications.icon(notification.kind),
        route: this.notifications.route(notification),
        notificationId: notification.id,
      }));
  }

  private pageMatches(query: string): SearchSuggestion[] {
    return this.pages
      .filter((page) => this.matches(query, this.i18n.t(page.labelKey)))
      .slice(0, MAX_PER_GROUP)
      .map((page) => ({
        id: `page:${page.path}`,
        label: this.i18n.t(page.labelKey),
        meta: '',
        icon: page.icon,
        route: [page.path],
      }));
  }

  private matches(query: string, ...fields: Array<string | null | undefined>): boolean {
    return fields.some((field) => field && this.normalize(field).includes(query));
  }

  /** Minúsculas e sem acentos, para "joao" encontrar "João". */
  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
