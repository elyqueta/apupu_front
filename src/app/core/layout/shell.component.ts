import { Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { debounceTime, distinctUntilChanged, filter, Subject } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { AuthService } from '../../core/api/auth.service';
import { toApiError } from '../../core/api/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { EventMenuBridgeService } from '../../core/services/event-menu-bridge.service';
import { SearchGroup, SearchService, SearchSuggestion } from '../../core/services/search.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { NotificationPresenter } from '../../shared/services/notification.presenter';
import { HostNotification } from '../../core/models/models';
import { EVENT_TABS } from '../../features/events/detail/detail.models';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { BrandComponent } from '../../shared/components/brand.component';
import { EventMenuDrawerComponent } from '../../shared/components/event-menu-drawer.component';
import { EventSectionItem } from '../../shared/components/event-section-shell.component';
import { LogoComponent } from '../../shared/components/logo.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';
import { SearchSuggestionsComponent } from '../../shared/components/search-suggestions.component';
import { SkeletonComponent, SkeletonVariant } from '../../shared/components/skeleton.component';

interface NavItem {
  path: string;
  labelKey: TranslationKey;
  icon: IconDefinition;
  exact: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FaIconComponent,
    BrandComponent,
    LogoComponent,
    AvatarComponent,
    PreferenceControlsComponent,
    SearchSuggestionsComponent,
    SkeletonComponent,
    EventMenuDrawerComponent,
  ],
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);
  private readonly notificationPresenter = inject(NotificationPresenter);
  private readonly searchService = inject(SearchService);
  protected readonly eventMenuBridge = inject(EventMenuBridgeService);

  protected readonly mobileOpen = signal(false);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly notificationsOpen = signal(false);
  protected readonly eventMenuOpen = signal(false);
  protected readonly isEventDetail = signal(false);
  protected readonly eventBackLink = signal('/eventos');
  protected readonly eventBackLabel = signal<TranslationKey>('eventDetail.backToEvents');
  protected readonly searchTerm = signal('');
  protected readonly searchOpen = signal(false);
  protected readonly activeSuggestionId = signal<string | null>(null);
  protected readonly mobileSearchOpen = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly pageTitle = signal<TranslationKey>('nav.dashboard');
  protected readonly skeletonVariant = signal<SkeletonVariant>('dashboard');

  /** Termo já debounceado; o campo mostra `searchTerm` sem esperar. */
  private readonly debouncedTerm = signal('');
  private readonly remoteGroups = signal<SearchGroup[]>([]);
  private readonly searchInput$ = new Subject<string>();
  private searchSequence = 0;

  private readonly desktopSearchInput = viewChild<ElementRef<HTMLInputElement>>('desktopSearchInput');
  private readonly mobileSearchInput = viewChild<ElementRef<HTMLInputElement>>('mobileSearchInput');
  private readonly mobileSearchRoot = viewChild<ElementRef<HTMLElement>>('mobileSearchRoot');
  private readonly mobileSearchTrigger = viewChild<ElementRef<HTMLButtonElement>>('mobileSearchTrigger');

  protected readonly navItems: NavItem[] = [
    { path: '/painel', labelKey: 'nav.dashboard', icon: ICONS['dashboard'], exact: true },
    { path: '/eventos', labelKey: 'nav.events', icon: ICONS['events'], exact: false },
    { path: '/tarefas', labelKey: 'nav.tasks', icon: ICONS['checklist'], exact: false },
    { path: '/convites', labelKey: 'nav.invites', icon: ICONS['envelope'], exact: false },
    { path: '/mensagens', labelKey: 'nav.messages', icon: ICONS['envelopeOpen'], exact: false },
    { path: '/convidados', labelKey: 'nav.guests', icon: ICONS['guests'], exact: false },
    { path: '/equipas', labelKey: 'nav.team', icon: ICONS['guestGroup'], exact: false },
    { path: '/comunidades', labelKey: 'nav.communities', icon: ICONS['globe'], exact: false },
    { path: '/amigos', labelKey: 'nav.friends', icon: ICONS['userPlus'], exact: false },
    { path: '/templates', labelKey: 'nav.templates', icon: ICONS['templates'], exact: false },
    { path: '/relatorios', labelKey: 'nav.reports', icon: ICONS['reports'], exact: false },
    {
      path: '/notificacoes',
      labelKey: 'nav.notifications',
      icon: ICONS['bell'],
      exact: false,
    },
  ];

  /**
   * Itens da barra inferior (apenas mobile). Os quatro destinos mais usados do
   * anfitrião; o resto fica acessível pelo botão "Mais", que abre o drawer.
   */
  protected readonly bottomNavItems: NavItem[] = [
    { path: '/painel', labelKey: 'nav.dashboard', icon: ICONS['dashboard'], exact: true },
    { path: '/eventos', labelKey: 'nav.events', icon: ICONS['events'], exact: false },
    { path: '/convidados', labelKey: 'nav.guests', icon: ICONS['guests'], exact: false },
    { path: '/tarefas', labelKey: 'nav.tasks', icon: ICONS['checklist'], exact: false },
  ];

  /** Os mesmos destinos do rail, reutilizados no drawer da barra superior. */
  protected readonly eventMenuSections = computed<EventSectionItem[]>(() =>
    EVENT_TABS.map((tab) => ({
      id: tab.id,
      label: this.i18n.t(tab.labelKey),
      icon: ICONS[tab.icon],
    })),
  );

  protected readonly notifications = computed(() => this.store.notifications());
  protected readonly unreadNotifications = this.store.unreadNotifications;

  /** Grupos de sugestões: dados locais com o campo vazio, API quando escreve. */
  protected readonly suggestions = computed<SearchGroup[]>(() => {
    // Reage a "Limpar"/guardar pesquisas recentes sem novos pedidos.
    void this.searchService.recentRevision();
    const term = this.debouncedTerm().trim();
    if (!term) {
      return this.searchService.browse();
    }
    const local = this.searchService.suggest(term);
    const remote = this.remoteGroups();
    if (!remote.length) {
      return local;
    }
    return [
      ...remote,
      ...local.filter((group) => group.key !== 'guests' && group.key !== 'events'),
    ];
  });

  /** Lista achatada, para navegação por teclado com as setas. */
  private readonly flatSuggestions = computed<SearchSuggestion[]>(() =>
    this.suggestions().flatMap((group) => group.items),
  );

  constructor() {
    try {
      this.sidebarCollapsed.set(
        typeof localStorage !== 'undefined' &&
          localStorage.getItem('apupu.sidebar.collapsed') === 'true',
      );
    } catch {
      this.sidebarCollapsed.set(false);
    }

    // Carrega o "chrome" (perfil, atividade e eventos) depois de qualquer
    // `resetAll()` da autenticação. Cada página pede depois os domínios que
    // precisa via `store.load(...)`.
    this.store.load({});
    this.searchInput$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.debouncedTerm.set(value);
        const query = value.trim();
        if (!query) {
          this.remoteGroups.set([]);
          return;
        }
        const sequence = ++this.searchSequence;
        void this.searchService
          .searchRemote(query)
          .then((groups) => {
            if (sequence === this.searchSequence) {
              this.remoteGroups.set(groups);
            }
          })
          .catch(() => {
            if (sequence === this.searchSequence) {
              this.remoteGroups.set([]);
            }
          });
      });
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.updatePageTitle();
        this.mobileOpen.set(false);
        this.notificationsOpen.set(false);
        this.eventMenuOpen.set(false);
        this.mobileSearchOpen.set(false);
        this.closeSearch();
      });
    this.updatePageTitle();
  }

  /** Navega para a secção escolhida no drawer, mantendo o URL partilhável. */
  protected onEventMenuSection(id: string): void {
    const path = this.router.url.split('?')[0].split('#')[0];
    const query = id === 'resumo' ? '' : `?separador=${encodeURIComponent(id)}`;
    void this.router.navigateByUrl(`${path}${query}`);
  }

  /** Alterna o menu lateral no desktop e guarda a preferência localmente. */
  protected toggleSidebar(): void {
    const collapsed = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(collapsed);
    try {
      localStorage.setItem('apupu.sidebar.collapsed', String(collapsed));
    } catch {
      // O menu continua a funcionar quando o armazenamento não está disponível.
    }
  }

  /** Abre a barra de pesquisa (desktop) e foca o campo no mesmo gesto. */
  protected openSearch(): void {
    this.searchService.warm();
    this.searchOpen.set(true);
    this.desktopSearchInput()?.nativeElement.focus();
  }

  /**
   * Abre a pesquisa sobreposta do mobile. O campo já está no DOM (a camada só
   * usa a classe `hidden`), pelo que o `focus()` acontece ainda dentro do toque
   * — necessário para o teclado abrir no iOS/Safari.
   */
  protected openMobileSearch(): void {
    this.searchService.warm();
    this.mobileSearchOpen.set(true);
    this.searchTerm.set('');
    this.debouncedTerm.set('');
    this.activeSuggestionId.set(null);
    this.remoteGroups.set([]);
    this.searchSequence += 1;
    // A binding `[class.hidden]` só é aplicada na mudança de deteção seguinte.
    this.mobileSearchRoot()?.nativeElement.classList.remove('hidden');
    this.mobileSearchInput()?.nativeElement.focus();
  }

  protected onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.activeSuggestionId.set(null);
    this.searchInput$.next(value);
    if (!value.trim()) {
      this.remoteGroups.set([]);
    }
  }

  protected activeDescendant(prefix: string): string | null {
    const id = this.activeSuggestionId();
    return id ? `${prefix}${id}` : null;
  }

  protected clearRecents(): void {
    this.searchService.clearRecentSearches();
  }

  /** Setas para navegar, Enter para escolher, Escape para fechar. */
  protected onSearchKeydown(event: KeyboardEvent): void {
    const items = this.flatSuggestions();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!items.length) {
        return;
      }
      event.preventDefault();
      const current = this.activeSuggestionId();
      const index = current ? items.findIndex((item) => item.id === current) : -1;
      const next =
        event.key === 'ArrowDown'
          ? (index + 1) % items.length
          : index <= 0
            ? items.length - 1
            : index - 1;
      this.activeSuggestionId.set(items[next].id);
      return;
    }
    if (event.key === 'Enter') {
      const active = items.find((item) => item.id === this.activeSuggestionId());
      if (active) {
        event.preventDefault();
        void this.pickSuggestion(active);
      }
      return;
    }
    if (event.key === 'Escape') {
      if (this.mobileSearchOpen()) {
        this.closeMobileSearch();
      } else {
        this.closeSearch('desktop');
      }
    }
  }

  protected hoverSuggestion(id: string): void {
    this.activeSuggestionId.set(id);
  }

  /** Navega para o destino da sugestão e marca a notificação como lida. */
  protected async pickSuggestion(suggestion: SearchSuggestion): Promise<void> {
    this.rememberCurrentTerm(suggestion.label);
    if (this.mobileSearchOpen()) {
      this.closeMobileSearch();
    } else {
      this.closeSearch('desktop');
    }
    if (suggestion.notificationId) {
      try {
        await this.store.markNotificationRead(suggestion.notificationId);
      } catch {
        // A navegação não deve falhar por causa da marcação de leitura.
      }
    }
    await this.router.navigate(suggestion.route, { queryParams: suggestion.queryParams });
  }

  protected closeSearch(restoreFocus: 'desktop' | 'mobile' | null = null): void {
    this.searchOpen.set(false);
    this.activeSuggestionId.set(null);
    this.searchTerm.set('');
    this.debouncedTerm.set('');
    this.remoteGroups.set([]);
    this.searchSequence += 1;
    if (restoreFocus) {
      const input =
        restoreFocus === 'mobile'
          ? this.mobileSearchTrigger()?.nativeElement
          : this.desktopSearchInput()?.nativeElement;
      queueMicrotask(() => input?.focus());
    }
  }

  /** Fecha a sobreposição mobile e devolve o foco à lupa. */
  protected closeMobileSearch(): void {
    this.mobileSearchOpen.set(false);
    this.closeSearch('mobile');
  }

  /** Fecha o painel de sugestões ao clicar fora da pesquisa. */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-search-root], [data-search-trigger]')) {
      return;
    }
    if (this.mobileSearchOpen()) {
      this.closeMobileSearch();
    } else if (this.searchOpen()) {
      this.closeSearch('desktop');
    }
  }

  protected search(): void {
    const term = this.searchTerm().trim();
    if (!term) {
      return;
    }
    this.rememberCurrentTerm(term);
    void this.router.navigate(['/convidados'], { queryParams: { q: term } });
    this.searchTerm.set('');
  }

  /** Submete a pesquisa sobreposta do mobile e fecha-a. */
  protected submitMobileSearch(event: Event): void {
    event.preventDefault();
    this.search();
    this.closeMobileSearch();
  }

  private rememberCurrentTerm(fallback: string): void {
    this.searchService.rememberSearch(this.searchTerm().trim() || fallback);
  }

  protected notificationIcon(kind: HostNotification['kind']): IconDefinition {
    return this.notificationPresenter.icon(kind);
  }

  protected notificationTone(kind: HostNotification['kind']): string {
    return this.notificationPresenter.tone(kind);
  }

  protected notificationRoute(notification: HostNotification): string[] {
    return this.notificationPresenter.route(notification);
  }

  protected async openNotification(notification: HostNotification): Promise<void> {
    this.notificationsOpen.set(false);
    if (notification.read) {
      return;
    }
    try {
      await this.store.markNotificationRead(notification.id);
    } catch {
      // A navegação não deve falhar por causa da marcação de leitura.
    }
  }

  protected closeMenus(): void {
    this.mobileOpen.set(false);
    this.notificationsOpen.set(false);
    this.mobileSearchOpen.set(false);
  }

  protected async retry(): Promise<void> {
    await this.store.retry();
  }

  protected async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    try {
      await this.auth.logout();
      await this.router.navigate(['/entrar']);
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.loggingOut.set(false);
    }
  }

  private updatePageTitle(): void {
    const url = this.router.url.split('?')[0].split('#')[0];
    const eventDetail = /^\/eventos\/[^/]+/.test(url) || /^\/gestao\/evento\/[^/]+/.test(url);
    this.isEventDetail.set(eventDetail);
    if (eventDetail) {
      const management = url.startsWith('/gestao');
      this.eventBackLink.set(management ? '/gestao' : '/eventos');
      this.eventBackLabel.set(
        management ? 'eventDetail.backToManagement' : 'eventDetail.backToEvents',
      );
      this.pageTitle.set('nav.events');
      this.skeletonVariant.set('detail');
    } else if (url.startsWith('/eventos')) {
      this.pageTitle.set('nav.events');
      this.skeletonVariant.set(url.split('/').filter(Boolean).length > 1 ? 'detail' : 'cards');
    } else if (url.startsWith('/tarefas')) {
      this.pageTitle.set('nav.tasks');
      this.skeletonVariant.set('table');
    } else if (url.startsWith('/notificacoes')) {
      this.pageTitle.set('nav.notifications');
      this.skeletonVariant.set('table');
    } else if (url.startsWith('/convites')) {
      this.pageTitle.set('nav.invites');
      this.skeletonVariant.set('cards');
    } else if (url.startsWith('/mensagens')) {
      this.pageTitle.set('nav.messages');
      this.skeletonVariant.set('table');
    } else if (url.startsWith('/convidados')) {
      this.pageTitle.set('nav.guests');
      this.skeletonVariant.set('table');
    } else if (url.startsWith('/equipas')) {
      this.pageTitle.set('nav.team');
      this.skeletonVariant.set('cards');
    } else if (url.startsWith('/amigos')) {
      this.pageTitle.set('nav.friends');
      this.skeletonVariant.set('cards');
    } else if (url.startsWith('/comunidades')) {
      this.pageTitle.set('nav.communities');
      this.skeletonVariant.set(url.split('/').filter(Boolean).length > 1 ? 'detail' : 'cards');
    } else if (url.startsWith('/templates')) {
      this.pageTitle.set('nav.templates');
      this.skeletonVariant.set('cards');
    } else if (url.startsWith('/relatorios')) {
      this.pageTitle.set('nav.reports');
      this.skeletonVariant.set('chart');
    } else if (url.startsWith('/perfil')) {
      this.pageTitle.set('nav.profile');
      this.skeletonVariant.set('profile');
    } else if (url.startsWith('/definicoes')) {
      this.pageTitle.set('nav.settings');
      this.skeletonVariant.set('profile');
    } else if (url.startsWith('/gestao')) {
      this.pageTitle.set('nav.management');
      this.skeletonVariant.set('detail');
    } else if (url.startsWith('/criar-evento')) {
      this.pageTitle.set('create.eyebrow');
      this.skeletonVariant.set('detail');
    } else {
      this.pageTitle.set('nav.dashboard');
      this.skeletonVariant.set('dashboard');
    }
  }
}
