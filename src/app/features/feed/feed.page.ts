import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../core/api/auth.service';
import {
  FeedCommunity,
  FeedEvent,
  FeedItem,
  FeedPerson,
  FeedType,
  SearchResults,
  SocialRepository,
} from '../../core/data/social.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ICONS } from '../../core/ui/icons';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { BrandComponent } from '../../shared/components/brand.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import {
  FeedCommunityCardComponent,
  FeedEventCardComponent,
  FeedPersonCardComponent,
  eventPath,
} from './feed-cards.component';

const CATEGORIES = ['wedding', 'birthday', 'corporate', 'baby', 'other'] as const;

/**
 * Feed público (`/`, Bloco 12): eventos públicos próximos, comunidades e
 * pessoas públicas. Sem conta vê tudo o que é público e é convidado a criar
 * conta para ver perfis.
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
    FeedEventCardComponent,
    FeedCommunityCardComponent,
    FeedPersonCardComponent,
  ],
  templateUrl: './feed.page.html',
})
export class FeedPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly auth = inject(AuthService);
  private readonly social = inject(SocialRepository);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly types: { id: FeedType; label: TranslationKey; icon: string }[] = [
    { id: 'events', label: 'block12.feed.type.events', icon: 'calendar' },
    { id: 'communities', label: 'block12.feed.type.communities', icon: 'globe' },
    { id: 'people', label: 'block12.feed.type.people', icon: 'guests' },
  ];
  protected readonly categories = CATEGORIES;

  protected readonly type = signal<FeedType>('events');
  protected readonly category = signal<string>('');
  protected readonly items = signal<FeedItem[]>([]);
  protected readonly cursor = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal(false);
  protected readonly strip = signal<FeedCommunity[]>([]);

  protected readonly searchOpen = signal(false);
  protected readonly query = signal('');
  protected readonly results = signal<SearchResults | null>(null);
  protected readonly searching = signal(false);
  private searchSeq = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly gatePerson = signal<FeedPerson | null>(null);
  protected readonly signedIn = computed(() => !!this.auth.host());

  protected readonly events = computed(() => this.items().filter((item): item is FeedEvent => item.type === 'event'));
  protected readonly communities = computed(() =>
    this.items().filter((item): item is FeedCommunity => item.type === 'community'),
  );
  protected readonly people = computed(() => this.items().filter((item): item is FeedPerson => item.type === 'person'));

  constructor() {
    this.title.setTitle(this.i18n.t('route.feed'));
    this.meta.updateTag({ name: 'description', content: this.i18n.t('block12.seo.description') });
    this.meta.updateTag({ property: 'og:title', content: this.i18n.t('route.feed') });
    this.meta.updateTag({ property: 'og:description', content: this.i18n.t('block12.seo.description') });

    if (this.browser) {
      void this.auth.restoreSession();
      void this.loadStrip();
    }
    effect(() => {
      this.type();
      this.category();
      untracked(() => void this.load());
    });
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      const page = await this.social.feed(this.type(), { category: this.type() === 'events' ? this.category() : undefined });
      this.items.set(page.items);
      this.cursor.set(page.next_cursor);
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
      const page = await this.social.feed(this.type(), {
        category: this.type() === 'events' ? this.category() : undefined,
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

  private async loadStrip(): Promise<void> {
    try {
      const page = await this.social.feed('communities');
      this.strip.set(page.items.filter((item): item is FeedCommunity => item.type === 'community').slice(0, 10));
    } catch {
      this.strip.set([]);
    }
  }

  protected setType(type: FeedType): void {
    this.type.set(type);
  }

  protected categoryLabel(id: string): string {
    return this.i18n.t(`type.${id}` as TranslationKey);
  }

  /* ─────────────────────────────── Pesquisa ─────────────────────────────── */

  protected openSearch(): void {
    this.searchOpen.set(true);
    queueMicrotask(() => document.getElementById('feed-search-input')?.focus());
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.query.set('');
    this.results.set(null);
  }

  protected onQuery(value: string): void {
    this.query.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const term = value.trim();
    if (term.length < 2) {
      this.results.set(null);
      return;
    }
    // Debounce de 250 ms e sequência: só a resposta mais recente é usada.
    this.searchTimer = setTimeout(async () => {
      const seq = ++this.searchSeq;
      this.searching.set(true);
      try {
        const results = await this.social.search(term);
        if (seq === this.searchSeq) this.results.set(results);
      } catch {
        if (seq === this.searchSeq) this.results.set({ events: [], communities: [], people: [] });
      } finally {
        if (seq === this.searchSeq) this.searching.set(false);
      }
    }, 250);
  }

  protected hasResults(results: SearchResults): boolean {
    return results.events.length + results.communities.length + results.people.length > 0;
  }

  protected eventLink(event: FeedEvent): string {
    return eventPath(event);
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
}
