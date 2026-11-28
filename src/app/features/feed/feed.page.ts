import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/api/auth.service';
import { ApiCommunity, CommunitiesRepository } from '../../core/data/communities.repository';
import { EventsRepository } from '../../core/data/events.repository';
import { HostEvent } from '../../core/models/models';
import {
  FeedCommunity,
  FeedInstitution,
  FeedEvent,
  FeedItem,
  FeedPerson,
  FeedType,
  SearchResults,
  SocialRepository,
} from '../../core/data/social.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { SearchGroup, SearchService, SearchSuggestion } from '../../core/services/search.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationsRepository } from '../../core/data/notifications.repository';
import { ICONS } from '../../core/ui/icons';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { BrandComponent } from '../../shared/components/brand.component';
import { InfoBlockComponent } from '../../shared/components/info-block.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';
import { PublicEntityCardComponent } from '../../shared/components/public-entity-card.component';
import { PublicEventCardComponent } from '../../shared/components/public-event-card.component';
import { PublicHeaderComponent } from '../../shared/components/public-header.component';
import { SearchSuggestionsComponent } from '../../shared/components/search-suggestions.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { FeedPersonCardComponent, eventPath } from './feed-cards.component';

const CATEGORIES = ['wedding', 'birthday', 'corporate', 'baby', 'other'] as const;

/**
 * Feed público (`/`, Bloco 12), desenhado a partir das referências do autor
 * (`docs/REFERENCIAS-FEED-BLOCO-12.md`):
 *
 * - desktop em três colunas: perfil + atalhos | compositor + publicações |
 *   próximos eventos + sugestões;
 * - mobile: filtros numa só fila, cartões de flyer sem sobreposições e
 *   navegação inferior flutuante com rótulos visíveis.
 *
 * Sem conta vê tudo o que é público e é convidado a criar conta para ver
 * perfis.
 */
@Component({
  selector: 'app-feed-page',
  imports: [
    RouterLink,
    FaIconComponent,
    AvatarComponent,
    BrandComponent,
    ModalComponent,
    PreferenceControlsComponent,
    SkeletonComponent,
    PublicHeaderComponent,
    SearchSuggestionsComponent,
    PublicEventCardComponent,
    PublicEntityCardComponent,
    InfoBlockComponent,
    FeedPersonCardComponent,
  ],
  templateUrl: './feed.page.html',
})
export class FeedPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly auth = inject(AuthService);
  private readonly social = inject(SocialRepository);
  private readonly communitiesRepo = inject(CommunitiesRepository);
  private readonly eventsRepo = inject(EventsRepository);
  private readonly notificationsRepo = inject(NotificationsRepository);
  private readonly searchService = inject(SearchService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly types: { id: FeedType | 'all'; label: TranslationKey; icon: string }[] = [
    { id: 'all', label: 'block12.feed.type.all', icon: 'templates' },
    { id: 'events', label: 'block12.feed.type.events', icon: 'calendar' },
    { id: 'communities', label: 'block12.feed.type.communities', icon: 'globe' },
    { id: 'people', label: 'block12.feed.type.people', icon: 'guests' },
  ];
  protected readonly categories = CATEGORIES;

  protected readonly type = signal<FeedType | 'all'>('all');
  protected readonly category = signal<string>('');
  protected readonly items = signal<FeedItem[]>([]);
  protected readonly cursor = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal(false);

  /** Faixa de avatares (comunidades públicas) e colunas laterais. */
  protected readonly strip = signal<FeedCommunity[]>([]);
  protected readonly upcoming = signal<FeedEvent[]>([]);
  protected readonly suggestions = signal<FeedPerson[]>([]);
  protected readonly requested = signal<string[]>([]);
  protected readonly myCommunities = signal<ApiCommunity[]>([]);
  protected readonly friendCount = signal(0);
  protected readonly requestCount = signal(0);

  protected readonly menuOpen = signal(false);
  protected readonly categoriesOpen = signal(false);
  protected readonly searchOpen = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly activeSuggestionId = signal<string | null>(null);

  /** Termo já debounceado; o campo mostra `searchTerm` sem esperar. */
  private readonly debouncedTerm = signal('');
  private readonly remoteGroups = signal<SearchGroup[]>([]);
  private readonly remotePeople = signal<FeedPerson[]>([]);
  private readonly searchInput$ = new Subject<string>();
  private searchSequence = 0;
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('feedSearchInput');

  protected readonly gatePerson = signal<FeedPerson | null>(null);
  protected readonly unreadCount = signal(0);
  protected readonly signedIn = computed(() => !!this.auth.host());
  protected readonly me = computed(() => this.auth.host());
  protected readonly myName = computed(() => this.me()?.profile?.display_name || this.me()?.email || '');

  /** Contagens do cartão de perfil sempre via `i18n.plural`. */
  protected readonly friendCountLabel = computed(() =>
    this.i18n.plural(this.friendCount(), 'plural.friend.one', 'plural.friend.many'),
  );
  protected readonly requestCountLabel = computed(() =>
    this.i18n.plural(this.requestCount(), 'plural.friend.one', 'plural.friend.many'),
  );

  /** O visitante é convidado a criar conta antes de criar o primeiro evento. */
  protected readonly emptyActionLink = computed(() => (this.signedIn() ? '/criar-evento' : '/criar-conta'));

  protected readonly events = computed(() => this.items().filter((item): item is FeedEvent => item.type === 'event'));
  protected readonly institutions = computed(() =>
    this.items().filter((item): item is FeedInstitution => item.type === 'institution'),
  );
  protected readonly communities = computed(() =>
    this.items().filter((item): item is FeedCommunity => item.type === 'community'),
  );
  protected readonly people = computed(() => this.items().filter((item): item is FeedPerson => item.type === 'person'));

  /** A faixa só aparece quando há pelo menos dois destinos além de "Criar". */
  protected readonly showStrip = computed(() => this.strip().length >= 2);
  protected readonly bottomProfileLabel = computed(() =>
    this.signedIn() ? this.i18n.t('block12.feed.profile') : this.i18n.t('block12.feed.login'),
  );

  /** Mesmo padrão da shell: grupos locais primeiro, remotos (debounce) depois. */
  protected readonly searchGroups = computed<SearchGroup[]>(() => {
    // Reage a "Limpar"/guardar pesquisas recentes sem novos pedidos.
    void this.searchService.recentRevision();
    const term = this.debouncedTerm().trim();
    const known = this.publicGroups(term);
    if (!term) {
      return [...this.recentGroups(), ...known];
    }
    const remote = this.remoteGroups();
    if (!remote.length) {
      return known;
    }
    return [...remote, ...known.filter((group) => !remote.some((item) => item.key === group.key))];
  });

  /** Lista achatada, para navegação por teclado com as setas. */
  private readonly flatSuggestions = computed<SearchSuggestion[]>(() =>
    this.searchGroups().flatMap((group) => group.items),
  );

  constructor() {
    this.title.setTitle(this.i18n.t('route.feed'));
    this.meta.updateTag({ name: 'description', content: this.i18n.t('block12.seo.description') });
    this.meta.updateTag({ property: 'og:title', content: this.i18n.t('route.feed') });
    this.meta.updateTag({ property: 'og:description', content: this.i18n.t('block12.seo.description') });

    if (this.browser) {
      void this.eventsRepo.load().catch(() => undefined);
      void this.loadSidebars();
      effect(() => {
        if (this.auth.host()) {
          void this.notificationsRepo.refreshUnread().then((count) => this.unreadCount.set(count)).catch(() => undefined);
        }
      });
    }
    effect(() => {
      this.type();
      this.category();
      untracked(() => void this.load());
    });

    // Debounce e sequência iguais aos da pesquisa global da shell: só a
    // resposta mais recente atualiza os grupos e navegações antigas são
    // descartadas quando o termo muda.
    this.searchInput$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.debouncedTerm.set(value);
        const term = value.trim();
        if (term.length < 2) {
          this.remoteGroups.set([]);
          this.remotePeople.set([]);
          return;
        }
        const sequence = ++this.searchSequence;
        void this.social
          .search(term)
          .then((results) => {
            if (sequence === this.searchSequence) {
              this.remoteGroups.set(this.remoteSearchGroups(results));
              this.remotePeople.set(results.people);
            }
          })
          .catch(() => {
            if (sequence === this.searchSequence) {
              this.remoteGroups.set([]);
              this.remotePeople.set([]);
            }
          });
      });
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      const type = this.type();
      if (type === 'all') {
        const pages = await Promise.all([
          this.social.feed('events', { category: this.category() || undefined }),
          this.social.feed('communities'),
          this.social.feed('people'),
        ]);
        this.items.set([
          ...pages[0].items.filter((item) => item.type === 'event'),
          ...pages[1].items.filter((item) => item.type === 'community' || item.type === 'institution'),
          ...pages[2].items.filter((item) => item.type === 'person'),
        ]);
        this.cursor.set(null);
      } else {
        const page = await this.social.feed(type, { category: type === 'events' ? this.category() : undefined });
        this.items.set(page.items);
        this.cursor.set(page.next_cursor);
      }
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected async loadMore(): Promise<void> {
    const cursor = this.cursor();
    if (!cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    try {
      const type = this.type();
      if (type === 'all') return;
      const page = await this.social.feed(type, {
        category: type === 'events' ? this.category() : undefined,
        cursor,
      });
      this.items.update((items) => [...items, ...page.items]);
      this.cursor.set(page.next_cursor);
    } catch {
      this.error.set(true);
    } finally {
      this.loadingMore.set(false);
    }
  }

  /** Colunas laterais e faixa de avatares; falhas aqui nunca bloqueiam o feed. */
  private async loadSidebars(): Promise<void> {
    const host = await this.auth.restoreSession().catch(() => null);
    const [communities, events, people] = await Promise.all([
      this.social.feed('communities').catch(() => null),
      this.social.feed('events').catch(() => null),
      this.social.feed('people').catch(() => null),
    ]);
    this.strip.set((communities?.items ?? []).filter((item): item is FeedCommunity => item.type === 'community').slice(0, 12));
    this.upcoming.set((events?.items ?? []).filter((item): item is FeedEvent => item.type === 'event').slice(0, 4));
    this.suggestions.set(
      (people?.items ?? [])
        .filter((item): item is FeedPerson => item.type === 'person' && item.id !== host?.id)
        .slice(0, 5),
    );
    if (host) {
      const [mine, friends] = await Promise.all([
        this.communitiesRepo.list('mine').catch(() => []),
        this.social.friends().catch(() => null),
      ]);
      this.myCommunities.set(mine.filter((item) => item.my_status === 'active').slice(0, 6));
      this.friendCount.set(friends?.friends.length ?? 0);
      this.requestCount.set(friends?.incoming.length ?? 0);
      const pending = new Set((friends?.outgoing ?? []).map((entry) => entry.person.id));
      this.requested.set([...pending]);
    }
  }

  protected setType(type: FeedType | 'all'): void {
    this.type.set(type);
  }

  protected categoryLabel(id: string): string {
    return this.i18n.t(`type.${id}` as TranslationKey);
  }

  protected selectedCategoryLabel(): string {
    const category = this.category();
    return category ? this.categoryLabel(category) : this.i18n.t('block12.feed.category.all');
  }

  protected selectCategory(id: string): void {
    this.category.set(id);
    this.categoriesOpen.set(false);
  }

  protected compose(kind: 'event' | 'community'): void {
    if (!this.signedIn()) {
      void this.router.navigate(['/criar-conta']);
      return;
    }
    if (kind === 'event') {
      const events = this.ownedEvents();
      if (events.length === 0) {
        this.suggestionsOpen.set(true);
        return;
      }
      this.shareEvent.set(events[0]);
      this.shareCommunityId.set(this.shareCommunities()[0]?.id ?? '');
      this.shareOpen.set(true);
      return;
    }
    void this.router.navigate(['/comunidades']);
  }

  protected readonly shareOpen = signal(false);
  protected readonly shareEvent = signal<HostEvent | null>(null);
  protected readonly shareCommunityId = signal('');
  protected readonly suggestionsOpen = signal(false);

  /** Comunidades onde o membro pode publicar a sua atividade. */
  protected readonly shareCommunities = computed(() =>
    this.myCommunities().filter((community) => community.my_status === 'active'),
  );

  protected readonly ownedEvents = computed(() =>
    (this.eventsRepo.data() ?? []).filter((event) => event.status !== 'draft' && event.status !== 'cancelled'),
  );

  protected shareSelected(id: string): void {
    const event = this.ownedEvents().find((item) => item.id === id) ?? null;
    this.shareEvent.set(event);
  }

  protected async shareToFeed(): Promise<void> {
    const event = this.shareEvent();
    const communityId = this.shareCommunityId();
    if (!event || !communityId) return;
    try {
      await this.communitiesRepo.shareEventActivity(communityId, event.id);
      this.shareOpen.set(false);
      this.toasts.success(this.i18n.t('block12.feed.shared'));
    } catch (error) {
      const apiError = toApiError(error);
      this.toasts.error(apiError.status === 403 ? this.i18n.t('block11.common.forbidden') : apiError.message || this.i18n.t('block12.common.error'));
    }
  }

  protected createFirstEvent(): void {
    this.suggestionsOpen.set(false);
    void this.router.navigate(['/criar-evento']);
  }

  /** O botão central da navegação inferior abre diretamente a criação do convite. */
  protected createInvite(): void {
    if (!this.signedIn()) {
      void this.router.navigate(['/criar-conta']);
      return;
    }
    void this.router.navigate(['/criar-evento']);
  }

  /* ─────────────────────────────── Pesquisa ─────────────────────────────── */

  /** Abre a pesquisa no mesmo gesto em que o campo recebe o foco. */
  protected openSearch(): void {
    this.menuOpen.set(false);
    this.searchOpen.set(true);
    // O modal foca o botão de fechar ao abrir; o campo ganha o foco logo a
    // seguir, assim o teclado aparece também no mobile.
    setTimeout(() => this.searchInput()?.nativeElement.focus());
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.searchTerm.set('');
    this.debouncedTerm.set('');
    this.activeSuggestionId.set(null);
    this.remoteGroups.set([]);
    this.remotePeople.set([]);
    this.searchSequence += 1;
  }

  protected onQuery(value: string): void {
    this.searchTerm.set(value);
    this.activeSuggestionId.set(null);
    this.searchInput$.next(value);
    if (value.trim().length < 2) {
      this.searchSequence += 1;
      this.remoteGroups.set([]);
      this.remotePeople.set([]);
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
      event.preventDefault();
      // O modal também fecha com Escape; não deixar o evento chegar ao documento.
      event.stopPropagation();
      this.closeSearch();
    }
  }

  protected hoverSuggestion(id: string): void {
    this.activeSuggestionId.set(id);
  }

  /** Enter sem opção ativa guarda o termo, como nas outras barras de pesquisa. */
  protected submitSearch(event: Event): void {
    event.preventDefault();
    const term = this.searchTerm().trim();
    if (term.length >= 2) {
      this.rememberCurrentTerm(term);
    }
  }

  /** Escolha de um resultado: guarda o termo, fecha e navega (ou abre o perfil). */
  protected async pickSuggestion(suggestion: SearchSuggestion): Promise<void> {
    if (suggestion.id.startsWith('recent:')) {
      // Um recente volta a correr a pesquisa dentro da mesma folha.
      this.onQuery(suggestion.label);
      return;
    }
    this.rememberCurrentTerm(suggestion.label);
    const person = suggestion.id.startsWith('person:')
      ? [...this.remotePeople(), ...this.people(), ...this.suggestions()].find(
          (item) => `person:${item.id}` === suggestion.id,
        )
      : undefined;
    this.closeSearch();
    if (person) {
      this.openPerson(person);
      return;
    }
    await this.router.navigate(suggestion.route, { queryParams: suggestion.queryParams });
  }

  private rememberCurrentTerm(fallback: string): void {
    this.searchService.rememberSearch(this.searchTerm().trim() || fallback);
  }

  /** Recentes partilhados com a pesquisa da shell, com a ação "Limpar". */
  private recentGroups(): SearchGroup[] {
    // A sessão pode ser restaurada depois da abertura do feed; a chave dos
    // recentes depende do anfitrião e tem de ser recalculada nesse momento.
    void this.auth.host();
    const items = this.searchService.recentSearches().map((term) => ({
      id: `recent:${term}`,
      label: term,
      meta: '',
      icon: ICONS['history'],
      route: ['/'],
      queryParams: { q: term },
    }));
    return items.length ? [{ key: 'recents', labelKey: 'search.groupRecent', items }] : [];
  }

  /** Sugestões locais (já no feed) enquanto a resposta remota não chega. */
  private publicGroups(term: string): SearchGroup[] {
    const query = this.normalize(term);
    const limit = query ? 4 : 3;
    const groups: SearchGroup[] = [];

    const events = [...this.events(), ...this.upcoming()]
      .filter((event, index, all) => all.findIndex((item) => item.id === event.id) === index)
      .filter((event) => event.status !== 'completed' && event.status !== 'cancelled')
      .filter(
        (event) =>
          !query ||
          this.normalize([event.title, event.location, event.community?.name ?? ''].join(' ')).includes(query),
      )
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .slice(0, limit)
      .map((event) => ({
        id: `event:${event.id}`,
        label: event.title,
        meta: this.i18n.shortDate(event.starts_at, event.timezone),
        icon: ICONS['calendar'],
        route: ['/e', event.slug],
      }));
    if (events.length) {
      groups.push({ key: 'events', labelKey: 'block12.search.events', items: events });
    }

    const entities = [
      ...this.communities().map((item) => ({ id: item.id, name: item.name, slug: item.slug, icon: ICONS['globe'] })),
      ...this.institutions().map((item) => ({ id: item.id, name: item.name, slug: item.slug, icon: ICONS['bank'] })),
      ...this.strip().map((item) => ({ id: item.id, name: item.name, slug: item.slug, icon: ICONS['globe'] })),
    ]
      .filter((item, index, all) => all.findIndex((entry) => entry.id === item.id) === index)
      .filter((item) => !query || this.normalize(item.name).includes(query))
      .slice(0, limit)
      .map((item) => ({
        id: `community:${item.id}`,
        label: item.name,
        meta: '',
        icon: item.icon,
        route: ['/comunidade', item.slug],
      }));
    if (entities.length) {
      groups.push({ key: 'communities', labelKey: 'block12.search.communities', items: entities });
    }

    const people = [...this.people(), ...this.suggestions()]
      .filter((item, index, all) => all.findIndex((entry) => entry.id === item.id) === index)
      .filter((item) => item.id !== this.me()?.id)
      .filter((item) => !query || this.normalize(item.display_name ?? '').includes(query))
      .slice(0, limit)
      .map((item) => ({
        id: `person:${item.id}`,
        label: item.display_name || '',
        meta: '',
        icon: ICONS['user'],
        route: ['/pessoas', item.id],
      }));
    if (people.length) {
      groups.push({ key: 'people', labelKey: 'block12.search.people', items: people });
    }
    return groups;
  }

  /** Resultados do `/public/search`, com os mesmos grupos da pesquisa global. */
  private remoteSearchGroups(results: SearchResults): SearchGroup[] {
    const groups: SearchGroup[] = [];
    const events = results.events.map((event) => ({
      id: `event:${event.id}`,
      label: event.title,
      meta: this.i18n.shortDate(event.starts_at, event.timezone),
      icon: ICONS['calendar'],
      route: ['/e', event.slug],
    }));
    if (events.length) {
      groups.push({ key: 'events', labelKey: 'block12.search.events', items: events });
    }
    const entities = results.communities.map((item) => ({
      id: `community:${item.id}`,
      label: item.name,
      meta: '',
      icon: ICONS['globe'],
      route: ['/comunidade', item.slug],
    }));
    if (entities.length) {
      groups.push({ key: 'communities', labelKey: 'block12.search.communities', items: entities });
    }
    const people = results.people.map((item) => ({
      id: `person:${item.id}`,
      label: item.display_name || '',
      meta: '',
      icon: ICONS['user'],
      route: ['/pessoas', item.id],
    }));
    if (people.length) {
      groups.push({ key: 'people', labelKey: 'block12.search.people', items: people });
    }
    return groups;
  }

  /** Minúsculas e sem acentos, para "joao" encontrar "João". */
  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  protected eventLink(event: FeedEvent): string {
    return eventPath(event);
  }

  /** Chip de data da coluna lateral: dia grande e mês abreviado, sempre inteiro. */
  protected eventDay(event: FeedEvent): string {
    return this.i18n.formatDate(event.starts_at, event.timezone, { day: '2-digit' });
  }

  protected eventMonth(event: FeedEvent): string {
    return this.i18n
      .formatDate(event.starts_at, event.timezone, { month: 'short' })
      .replace('.', '')
      .toUpperCase();
  }

  /** Data por extenso na coluna lateral (ex.: `5 de dezembro de 2026 · 18:00`). */
  protected eventLongDate(event: FeedEvent): string {
    const date = this.i18n.formatDate(event.starts_at, event.timezone, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `${date} · ${this.i18n.time(event.starts_at, event.timezone)}`;
  }

  /* ─────────────────────────────── Pessoas ─────────────────────────────── */

  protected openPerson(person: FeedPerson): void {
    if (this.signedIn()) {
      this.closeSearch();
      void this.router.navigate(['/pessoas', person.id]);
    } else {
      this.gatePerson.set(person);
    }
  }

  protected async addFriend(person: FeedPerson): Promise<void> {
    if (!this.signedIn()) {
      this.gatePerson.set(person);
      return;
    }
    try {
      await this.social.requestFriend(person.id);
      this.requested.update((ids) => [...ids, person.id]);
      this.toasts.success(this.i18n.t('block12.friends.requested'));
    } catch {
      this.toasts.error(this.i18n.t('block12.common.error'));
    }
  }

  protected openProfile(): void {
    const me = this.me();
    void this.router.navigate(me ? ['/pessoas', me.id] : ['/entrar']);
  }
}
