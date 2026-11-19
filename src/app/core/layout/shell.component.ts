import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { AuthService } from '../../core/api/auth.service';
import { toApiError } from '../../core/api/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { SearchGroup, SearchService, SearchSuggestion } from '../../core/services/search.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { NotificationPresenter } from '../../shared/services/notification.presenter';
import { HostNotification } from '../../core/models/models';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { BrandComponent } from '../../shared/components/brand.component';
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

  protected readonly mobileOpen = signal(false);
  protected readonly notificationsOpen = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly searchOpen = signal(false);
  protected readonly activeSuggestionId = signal<string | null>(null);
  protected readonly mobileSearchOpen = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly pageTitle = signal<TranslationKey>('nav.dashboard');
  protected readonly skeletonVariant = signal<SkeletonVariant>('dashboard');

  protected readonly navItems: NavItem[] = [
    { path: '/painel', labelKey: 'nav.dashboard', icon: ICONS['dashboard'], exact: true },
    { path: '/eventos', labelKey: 'nav.events', icon: ICONS['events'], exact: false },
    { path: '/tarefas', labelKey: 'nav.tasks', icon: ICONS['checklist'], exact: false },
    { path: '/convites', labelKey: 'nav.invites', icon: ICONS['envelope'], exact: false },
    { path: '/convidados', labelKey: 'nav.guests', icon: ICONS['guests'], exact: false },
    { path: '/equipas', labelKey: 'nav.team', icon: ICONS['guestGroup'], exact: false },
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

  protected readonly notifications = computed(() => this.store.notifications());
  protected readonly unreadNotifications = this.store.unreadNotifications;

  /** Grupos de sugestões para o termo atual (vazio sem termo). */
  protected readonly suggestions = computed<SearchGroup[]>(() => {
    const term = this.searchTerm().trim();
    return term ? this.searchService.suggest(term) : [];
  });

  /** Lista achatada, para navegação por teclado com as setas. */
  private readonly flatSuggestions = computed<SearchSuggestion[]>(() =>
    this.suggestions().flatMap((group) => group.items),
  );

  constructor() {
    // Carrega o "chrome" (perfil, atividade e eventos) depois de qualquer
    // `resetAll()` da autenticação. Cada página pede depois os domínios que
    // precisa via `store.load(...)`.
    this.store.load({});
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.updatePageTitle();
        this.mobileOpen.set(false);
        this.notificationsOpen.set(false);
        this.mobileSearchOpen.set(false);
        this.closeSearch();
      });
    this.updatePageTitle();
  }

  /** Abre a barra de pesquisa (desktop) e aquece convidados/tarefas em fundo. */
  protected openSearch(): void {
    this.searchService.warm();
    this.searchOpen.set(true);
  }

  /** Abre a pesquisa sobreposta do mobile e aquece os dados das sugestões. */
  protected openMobileSearch(): void {
    this.searchService.warm();
    this.mobileSearchOpen.set(true);
  }

  protected onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.activeSuggestionId.set(null);
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
      this.closeSearch();
    }
  }

  protected hoverSuggestion(id: string): void {
    this.activeSuggestionId.set(id);
  }

  /** Navega para o destino da sugestão e marca a notificação como lida. */
  protected async pickSuggestion(suggestion: SearchSuggestion): Promise<void> {
    this.closeSearch();
    if (suggestion.notificationId) {
      try {
        await this.store.markNotificationRead(suggestion.notificationId);
      } catch {
        // A navegação não deve falhar por causa da marcação de leitura.
      }
    }
    await this.router.navigate(suggestion.route, { queryParams: suggestion.queryParams });
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.activeSuggestionId.set(null);
    this.searchTerm.set('');
  }

  /** Fecha o painel de sugestões ao clicar fora da pesquisa. */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-search-root]')) {
      return;
    }
    if (this.searchOpen()) {
      this.searchOpen.set(false);
    }
  }

  protected search(): void {
    const term = this.searchTerm().trim();
    if (!term) {
      return;
    }
    void this.router.navigate(['/convidados'], { queryParams: { q: term } });
    this.searchTerm.set('');
  }

  /** Submete a pesquisa sobreposta do mobile e fecha-a. */
  protected submitMobileSearch(event: Event): void {
    event.preventDefault();
    this.search();
    this.mobileSearchOpen.set(false);
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
    if (url.startsWith('/eventos')) {
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
    } else if (url.startsWith('/convidados')) {
      this.pageTitle.set('nav.guests');
      this.skeletonVariant.set('table');
    } else if (url.startsWith('/equipas')) {
      this.pageTitle.set('nav.team');
      this.skeletonVariant.set('cards');
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
