import { inject, Injectable } from '@angular/core';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../i18n/i18n.service';
import { TranslationKey } from '../i18n/translations';
import { ICONS } from '../ui/icons';
import { NotificationPresenter } from '../../shared/services/notification.presenter';
import { WorkspaceStore } from './workspace.store';

/** Máximo de itens por categoria para manter a lista curta em mobile. */
const MAX_PER_GROUP = 4;

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
 * páginas) e, depois de `warm()`, também de convidados e tarefas. Não inventa
 * endpoints: tudo sai dos repositórios do `WorkspaceStore`. A pesquisa é
 * insensível a maiúsculas e acentos.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly store = inject(WorkspaceStore);
  private readonly i18n = inject(I18nService);
  private readonly notifications = inject(NotificationPresenter);

  private warmed = false;

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

  /** Aquece convidados e tarefas (uma só vez) para os incluir nas sugestões. */
  warm(): void {
    if (this.warmed) {
      return;
    }
    this.warmed = true;
    this.store.warmSearch();
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
