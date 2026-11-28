import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/api/auth.service';
import { FeedEvent, PublicCommunity, SocialRepository } from '../../core/data/social.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { InfoBlockComponent } from '../../shared/components/info-block.component';
import { PublicEventCardComponent } from '../../shared/components/public-event-card.component';
import { PublicHeaderComponent } from '../../shared/components/public-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';

type State = 'loading' | 'ready' | 'not_found' | 'error';

/**
 * A API pública não expõe a instituição da comunidade. O campo só é mostrado
 * se alguma resposta efetivamente o devolver (contrato opcional abaixo).
 */
type PublicCommunityWithInstitution = PublicCommunity & {
  institution?: { name?: unknown; slug?: string | null } | null;
};

/**
 * Comunidade pública em modo limitado (`/comunidade/:slug`, Bloco 12):
 * acessível sem conta, sem lista de membros. Com conta mostra também os
 * eventos anteriores e o atalho para a página completa da comunidade.
 */
@Component({
  selector: 'app-public-community-page',
  imports: [
    RouterLink,
    FaIconComponent,
    AvatarComponent,
    InfoBlockComponent,
    PublicEventCardComponent,
    PublicHeaderComponent,
    SkeletonComponent,
  ],
  template: `
    <app-public-header [signedIn]="signedIn()" backLink="/" [backLabel]="i18n.t('common.back')" />

    <div class="mx-auto flex min-h-dvh max-w-6xl flex-col gap-5 px-4 pb-16 pt-4 sm:px-6">
      @switch (state()) {
        @case ('loading') { <app-skeleton variant="detail" /> }
        @case ('not_found') {
          <p
            class="rounded-4xl border border-line bg-surface p-8 text-center text-sm font-semibold text-ink shadow-card"
            data-testid="public-community-not-found"
          >
            {{ i18n.t('block12.community.notFound') }}
          </p>
        }
        @case ('error') {
          <div class="rounded-4xl border border-line bg-surface p-6 text-center shadow-card" role="alert">
            <p class="text-sm font-semibold text-ink">{{ i18n.t('block12.common.error') }}</p>
            <button type="button" class="ui-btn-secondary mt-3" (click)="load()">{{ i18n.t('block12.feed.retry') }}</button>
          </div>
        }
        @case ('ready') {
          @if (community(); as c) {
            <article class="relative rounded-4xl border border-line bg-surface shadow-card" data-testid="public-community-profile">
              <!-- Só a capa é cortada; o avatar vive fora deste contentor. -->
              <div class="overflow-hidden rounded-t-4xl">
                <div class="relative h-36 bg-gradient-to-br from-brand/35 via-surface to-surface sm:h-48">
                  @if (c.cover_url) {
                    <img [src]="c.cover_url" alt="" class="size-full object-cover" />
                  }
                </div>
              </div>
              <div class="relative z-10 flex flex-col gap-4 p-4 pt-0 sm:flex-row sm:items-end sm:justify-between sm:p-6 sm:pt-0">
                <div class="flex min-w-0 items-end gap-3">
                  <app-avatar
                    class="-mt-10 shrink-0 rounded-full border-4 border-line bg-surface shadow-card"
                    [name]="c.name"
                    [imageUrl]="c.avatar_url"
                    size="2xl"
                  />
                  <div class="min-w-0 pb-1">
                    <h1 class="break-words font-display text-2xl font-semibold tracking-tight text-ink">{{ c.name }}</h1>
                    <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      <span class="inline-flex items-center gap-1.5 rounded-full border border-line/40 bg-surface/60 px-2.5 py-1 font-semibold text-brand backdrop-blur-xl">
                        <fa-icon [icon]="icons['globe']" class="text-[10px]" aria-hidden="true" />
                        {{ i18n.t('block12.feed.public') }}
                      </span>
                      <span>{{ i18n.plural(c.member_count, 'plural.member.one', 'plural.member.many') }}</span>
                      @if (institution(); as institution) {
                        <span class="inline-flex items-center gap-1.5 rounded-full border border-line/40 bg-surface/60 px-2.5 py-1 text-brand backdrop-blur-xl">
                          <fa-icon [icon]="icons['bank']" class="text-[10px]" aria-hidden="true" />
                          {{ i18n.t('block13.community.partOf', { name: institution.name }) }}
                        </span>
                      }
                    </p>
                  </div>
                </div>
                @if (signedIn()) {
                  <a
                    [routerLink]="['/comunidades', c.slug]"
                    class="ui-btn shrink-0"
                    data-testid="public-community-open"
                  >{{ i18n.t('block12.community.openFull') }}</a>
                } @else {
                  <a
                    routerLink="/criar-conta"
                    class="ui-btn shrink-0"
                    data-testid="public-community-join-cta"
                  >{{ i18n.t('block12.community.joinVisitor') }}</a>
                }
              </div>
              @if (c.description) {
                <p class="border-t border-line px-4 py-3 text-sm leading-6 text-muted sm:px-6">{{ c.description }}</p>
              }
            </article>

            @if (!signedIn()) {
              <app-info-block
                icon="info"
                [title]="i18n.t('block12.community.joinTitle')"
                [message]="i18n.t('block12.community.joinMessage')"
                [actionLabel]="i18n.t('public.header.signup')"
                actionLink="/criar-conta"
                testId="public-community-join"
              />
            }

            <section data-testid="public-community-upcoming">
              <h2 class="mb-3 text-sm font-semibold text-ink">{{ i18n.t('block12.feed.upcomingTitle') }}</h2>
              @if (upcoming().length > 0) {
                <ul class="grid auto-rows-fr grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  @for (event of upcoming(); track event.id) {
                    <li class="h-full min-w-0"><app-public-event-card [event]="event" variant="compact" /></li>
                  }
                </ul>
              } @else {
                <app-info-block
                  icon="info"
                  [title]="i18n.t('block12.community.noEvents')"
                  [message]="i18n.t('block12.community.noEventsHint')"
                  testId="public-community-no-upcoming"
                />
              }
            </section>

            <section data-testid="public-community-past">
              <h2 class="mb-3 text-sm font-semibold text-ink">{{ i18n.t('block12.profile.pastEvents') }}</h2>
              @if (past().length > 0) {
                <ul class="grid auto-rows-fr grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  @for (event of past(); track event.id) {
                    <li class="h-full min-w-0"><app-public-event-card [event]="event" variant="compact" /></li>
                  }
                </ul>
              } @else {
                <app-info-block
                  icon="info"
                  [title]="i18n.t('block12.community.noEvents')"
                  [message]="i18n.t('block12.community.noEventsHint')"
                  testId="public-community-no-past"
                />
              }
            </section>
          }
        }
      }
    </div>
  `,
})
export class PublicCommunityPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly social = inject(SocialRepository);
  private readonly auth = inject(AuthService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly slug = input('');

  protected readonly state = signal<State>('loading');
  protected readonly community = signal<PublicCommunity | null>(null);
  protected readonly pastFromApi = signal<FeedEvent[]>([]);
  protected readonly signedIn = computed(() => !!this.auth.host());

  /** Só mostra a instituição se o payload público a tiver trazido. */
  protected readonly institution = computed(() => {
    const institution = (this.community() as PublicCommunityWithInstitution | null)?.institution;
    return institution && typeof institution.name === 'string' && institution.name.trim().length > 0
      ? { name: institution.name }
      : null;
  });

  private readonly events = computed(() => {
    const byId = new Map<string, FeedEvent>();
    for (const event of [...(this.community()?.events ?? []), ...this.pastFromApi()]) {
      if (!byId.has(event.id)) byId.set(event.id, event);
    }
    return [...byId.values()];
  });

  protected readonly upcoming = computed(() =>
    this.events()
      .filter((event) => event.status !== 'cancelled' && !this.isPast(event))
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)),
  );

  protected readonly past = computed(() =>
    this.events()
      .filter((event) => this.isPast(event))
      .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at)),
  );

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (slug) untracked(() => void this.load(slug));
    });
  }

  private isPast(event: FeedEvent): boolean {
    if (event.status === 'cancelled') return false;
    return event.status === 'completed' || Date.parse(event.starts_at) < Date.now();
  }

  protected async load(slug = this.slug()): Promise<void> {
    this.state.set('loading');
    try {
      const community = await this.social.publicCommunity(slug);
      this.community.set(community);
      this.pastFromApi.set([]);
      this.title.setTitle(`${community.name} · Conto Contigo`);
      this.meta.updateTag({ name: 'description', content: community.description ?? community.name });
      this.state.set('ready');
      if (this.browser && (await this.auth.restoreSession())) {
        this.pastFromApi.set((await this.social.communityEvents(slug, true)).items);
      }
    } catch (error: unknown) {
      this.state.set(toApiError(error).status === 404 ? 'not_found' : 'error');
    }
  }
}
