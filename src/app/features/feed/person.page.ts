import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/api/auth.service';
import { FeedEvent, FeedPerson, ProfileDetail, SocialRepository } from '../../core/data/social.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { BrandComponent } from '../../shared/components/brand.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { LinkCopyService } from '../../shared/services/link-copy.service';
import { FeedCommunityCardComponent, FeedEventCardComponent } from './feed-cards.component';

type State = 'loading' | 'ready' | 'not_found' | 'error';

/**
 * Perfil público (`/pessoas/:id`, Bloco 12). Com conta: eventos,
 * comunidades, amigos/comunidades em comum, eventos anteriores e
 * "Adicionar amigo". Sem conta: só nome e foto, com convite a criar conta.
 */
@Component({
  selector: 'app-person-page',
  imports: [RouterLink, FaIconComponent, AvatarComponent, BrandComponent, SkeletonComponent, FeedEventCardComponent, FeedCommunityCardComponent],
  template: `
    <div class="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 px-4 pb-16 pt-4 sm:px-6">
      <header class="flex items-center justify-between gap-3">
        <a routerLink="/" class="ui-icon-button" [attr.aria-label]="i18n.t('block12.feed.title')">
          <fa-icon [icon]="icons['chevronLeft']" aria-hidden="true" />
        </a>
        <app-brand [height]="44" />
      </header>

      @switch (state()) {
        @case ('loading') { <app-skeleton variant="detail" /> }
        @case ('not_found') {
          <p class="rounded-4xl border border-line bg-surface p-8 text-center text-sm font-semibold text-ink" data-testid="person-not-found">{{ i18n.t('block12.profile.notFound') }}</p>
        }
        @case ('error') {
          <div class="rounded-4xl border border-coral/30 bg-coral/10 p-6 text-center" role="alert">
            <p class="text-sm font-semibold text-coral">{{ i18n.t('block12.common.error') }}</p>
            <button type="button" class="ui-btn-secondary mt-3" (click)="load()">{{ i18n.t('block12.feed.retry') }}</button>
          </div>
        }
        @case ('ready') {
          @if (person(); as p) {
            <article class="relative overflow-hidden rounded-4xl border border-line bg-surface shadow-card">
              <div class="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)]"></div>
              <div class="relative h-32 bg-gradient-to-br from-brand/40 via-secondary/20 to-surface sm:h-44">
                @if (p.cover_url) { <img [src]="p.cover_url" alt="" class="size-full object-cover" /> }
              </div>
              <div class="relative flex flex-col gap-3 p-4 pt-0 sm:flex-row sm:items-end sm:justify-between sm:p-6 sm:pt-0">
                <div class="flex items-end gap-3">
                  <app-avatar class="-mt-10 rounded-full border-4 border-surface shadow-card" [name]="p.display_name || '?'" [imageUrl]="p.avatar_url" size="2xl" />
                  <div class="pb-1">
                    <h1 class="font-display text-2xl font-semibold tracking-tight text-ink">{{ p.display_name }}</h1>
                    @if (detail(); as d) {
                      <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span class="inline-flex items-center gap-1.5">
                          <fa-icon [icon]="icons['guestGroup']" class="text-[10px] text-brand-strong" aria-hidden="true" />
                          {{ i18n.t('block12.profile.friends', { count: d.friend_count }) }}
                        </span>
                        @if (d.mutual_friends.total > 0) {
                          <span class="inline-flex items-center gap-1.5">
                            <fa-icon [icon]="icons['userCheck']" class="text-[10px] text-brand-strong" aria-hidden="true" />
                            {{ i18n.t('block12.profile.mutualFriends', { count: d.mutual_friends.total }) }}
                          </span>
                        }
                      </p>
                      @if (d.is_self) {
                        <p class="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-strong">
                          <fa-icon [icon]="icons['check']" aria-hidden="true" />
                          {{ i18n.t('block12.profile.self') }}
                        </p>
                      }
                    }
                  </div>
                </div>
                @if (detail(); as d) {
                  <div class="flex flex-wrap items-center gap-2">
                    @if (d.is_self) {
                      <a routerLink="/perfil" class="ui-btn-secondary">
                        <fa-icon [icon]="icons['pen']" aria-hidden="true" />
                        {{ i18n.t('block12.profile.editProfile') }}
                      </a>
                    } @else {
                      <div class="flex flex-wrap gap-2" data-testid="person-friendship">
                        @switch (d.friendship.status) {
                          @case ('none') {
                            <button type="button" class="ui-btn" [disabled]="busy()" data-testid="person-add-friend" (click)="addFriend()">
                              <fa-icon [icon]="icons['userPlus']" aria-hidden="true" /> {{ i18n.t('block12.profile.addFriend') }}
                            </button>
                          }
                          @case ('pending') {
                            @if (d.friendship.direction === 'incoming') {
                              <button type="button" class="ui-btn" [disabled]="busy()" (click)="respond(true)">{{ i18n.t('block12.profile.acceptRequest') }}</button>
                            } @else {
                              <span class="ui-chip">{{ i18n.t('block12.profile.requested') }}</span>
                              <button type="button" class="ui-btn-secondary" [disabled]="busy()" (click)="removeFriendship()">{{ i18n.t('block12.profile.cancelRequest') }}</button>
                            }
                          }
                          @case ('accepted') {
                            <span class="ui-chip"><fa-icon [icon]="icons['userCheck']" aria-hidden="true" /> {{ i18n.t('block12.profile.isFriend') }}</span>
                            <button type="button" class="ui-btn-secondary" [disabled]="busy()" (click)="removeFriendship()">{{ i18n.t('block12.profile.removeFriend') }}</button>
                          }
                        }
                      </div>
                    }
                    <button
                      type="button"
                      class="ui-icon-button"
                      [attr.aria-label]="i18n.t('block12.profile.share')"
                      [attr.title]="i18n.t('block12.profile.share')"
                      (click)="shareProfile()"
                    >
                      <fa-icon [icon]="icons['share']" aria-hidden="true" />
                    </button>
                  </div>
                }
              </div>
            </article>

            @if (detail(); as d) {
              <section class="grid grid-cols-3 gap-2 sm:grid-cols-4" data-testid="person-stats">
                <div class="flex flex-col gap-1 rounded-2xl border border-line bg-surface/80 p-3 shadow-card backdrop-blur-xl">
                  <fa-icon [icon]="icons['guestGroup']" class="text-sm text-brand-strong" aria-hidden="true" />
                  <span class="text-lg font-semibold tabular-nums text-ink">{{ d.friend_count }}</span>
                  <span class="text-[11px] text-muted">{{ i18n.t('block12.friends.title') }}</span>
                </div>
                <div class="flex flex-col gap-1 rounded-2xl border border-line bg-surface/80 p-3 shadow-card backdrop-blur-xl">
                  <fa-icon [icon]="icons['events']" class="text-sm text-brand-strong" aria-hidden="true" />
                  <span class="text-lg font-semibold tabular-nums text-ink">{{ d.events.length }}</span>
                  <span class="text-[11px] text-muted">{{ i18n.t('block12.profile.events') }}</span>
                </div>
                <div class="flex flex-col gap-1 rounded-2xl border border-line bg-surface/80 p-3 shadow-card backdrop-blur-xl">
                  <fa-icon [icon]="icons['globe']" class="text-sm text-brand-strong" aria-hidden="true" />
                  <span class="text-lg font-semibold tabular-nums text-ink">{{ d.communities.length }}</span>
                  <span class="text-[11px] text-muted">{{ i18n.t('block12.profile.communities') }}</span>
                </div>
                <div class="flex flex-col gap-1 rounded-2xl border border-line bg-surface/80 p-3 shadow-card backdrop-blur-xl max-sm:col-span-3">
                  <fa-icon [icon]="icons['userCheck']" class="text-sm text-brand-strong" aria-hidden="true" />
                  <span class="text-lg font-semibold tabular-nums text-ink">{{ d.mutual_friends.total }}</span>
                  <span class="text-[11px] text-muted">{{ i18n.t('block12.profile.mutualFriends', { count: d.mutual_friends.total }) }}</span>
                </div>
              </section>

              @if (d.mutual_friends.preview.length > 0) {
                <section class="rounded-4xl border border-line bg-surface/80 p-4 shadow-card backdrop-blur-xl">
                  <div class="mb-3 flex items-center gap-2">
                    <span class="grid size-9 place-items-center rounded-xl border border-brand/20 bg-brand/10 text-brand-strong">
                      <fa-icon [icon]="icons['guestGroup']" aria-hidden="true" />
                    </span>
                    <h2 class="text-sm font-semibold text-ink">{{ i18n.t('block12.profile.mutualFriends', { count: d.mutual_friends.total }) }}</h2>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    @for (friend of d.mutual_friends.preview; track friend.id) {
                      <a [routerLink]="['/pessoas', friend.id]" class="group inline-flex items-center gap-2 rounded-full border border-line bg-surface-raised/60 py-1 pl-1 pr-3 transition hover:border-brand/40 hover:bg-brand/5">
                        <app-avatar [name]="friend.display_name || '?'" [imageUrl]="friend.avatar_url" size="xs" />
                        <span class="max-w-32 truncate text-xs font-medium text-ink">{{ friend.display_name }}</span>
                      </a>
                    }
                  </div>
                </section>
              }
            }

            @if (!detail()) {
              <div class="flex flex-col items-center gap-3 rounded-4xl border border-brand/25 bg-brand/10 p-6 text-center" data-testid="person-gate">
                <h2 class="font-display text-lg font-semibold text-ink">{{ i18n.t('block12.gate.title') }}</h2>
                <p class="max-w-md text-sm leading-6 text-muted">{{ i18n.t('block12.gate.body') }}</p>
                <div class="flex flex-wrap justify-center gap-2">
                  <a routerLink="/criar-conta" class="ui-btn">{{ i18n.t('block12.gate.signup') }}</a>
                  <a routerLink="/entrar" [queryParams]="{ returnUrl: '/pessoas/' + p.id }" class="ui-btn-secondary">{{ i18n.t('block12.gate.login') }}</a>
                </div>
              </div>
            } @else if (detail(); as d) {
              <section class="rounded-4xl border border-line bg-surface/80 p-4 shadow-card backdrop-blur-xl">
                <div class="mb-3 flex items-center gap-2">
                  <span class="grid size-9 place-items-center rounded-xl border border-brand/20 bg-brand/10 text-brand-strong">
                    <fa-icon [icon]="icons['guestGroup']" aria-hidden="true" />
                  </span>
                  <h2 class="text-sm font-semibold text-ink">{{ i18n.t('block12.profile.mutualCommunities') }}</h2>
                  <span class="ml-auto rounded-full border border-line bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-muted">{{ d.mutual_communities.length }}</span>
                </div>
                @if (d.mutual_communities.length === 0) {
                  <p class="text-sm text-muted">{{ i18n.t('block12.profile.noMutual') }}</p>
                } @else {
                  <div class="flex flex-wrap gap-2">
                    @for (community of d.mutual_communities; track community.id) {
                      <a [routerLink]="['/comunidades', community.slug]" class="ui-chip-interactive">{{ community.name }}</a>
                    }
                  </div>
                }
              </section>

              <section class="rounded-4xl border border-line bg-surface/80 p-4 shadow-card backdrop-blur-xl">
                <div class="mb-3 flex items-center gap-2">
                  <span class="grid size-9 place-items-center rounded-xl border border-brand/20 bg-brand/10 text-brand-strong">
                    <fa-icon [icon]="icons['events']" aria-hidden="true" />
                  </span>
                  <h2 class="text-sm font-semibold text-ink">{{ i18n.t('block12.profile.events') }}</h2>
                  <span class="ml-auto rounded-full border border-line bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-muted">{{ d.events.length }}</span>
                </div>
                @if (d.events.length === 0) {
                  <div class="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-surface-raised/40 p-4">
                    <span class="grid size-10 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brand/10 text-brand-strong">
                      <fa-icon [icon]="icons['calendar']" aria-hidden="true" />
                    </span>
                    <p class="text-sm text-muted">{{ i18n.t('block12.profile.noEvents') }}</p>
                  </div>
                } @else {
                  <ul class="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    @for (event of d.events; track event.id) { <li class="h-full min-w-0"><app-feed-event-card [event]="event" /></li> }
                  </ul>
                }
              </section>

              <section class="rounded-4xl border border-line bg-surface/80 p-4 shadow-card backdrop-blur-xl">
                <div class="mb-3 flex items-center gap-2">
                  <span class="grid size-9 place-items-center rounded-xl border border-brand/20 bg-brand/10 text-brand-strong">
                    <fa-icon [icon]="icons['globe']" aria-hidden="true" />
                  </span>
                  <h2 class="text-sm font-semibold text-ink">{{ i18n.t('block12.profile.communities') }}</h2>
                  <span class="ml-auto rounded-full border border-line bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-muted">{{ d.communities.length }}</span>
                </div>
                @if (d.communities.length === 0) {
                  <div class="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-surface-raised/40 p-4">
                    <span class="grid size-10 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brand/10 text-brand-strong">
                      <fa-icon [icon]="icons['globe']" aria-hidden="true" />
                    </span>
                    <p class="text-sm text-muted">{{ i18n.t('block12.profile.noCommunities') }}</p>
                  </div>
                } @else {
                  <ul class="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    @for (community of d.communities; track community.id) { <li class="h-full min-w-0"><app-feed-community-card [community]="community" /></li> }
                  </ul>
                }
              </section>

              @if (past().length > 0) {
                <section class="rounded-4xl border border-line bg-surface/80 p-4 shadow-card backdrop-blur-xl" data-testid="person-past-events">
                  <div class="mb-3 flex items-center gap-2">
                    <span class="grid size-9 place-items-center rounded-xl border border-brand/20 bg-brand/10 text-brand-strong">
                      <fa-icon [icon]="icons['clock']" aria-hidden="true" />
                    </span>
                    <h2 class="text-sm font-semibold text-ink">{{ i18n.t('block12.profile.pastEvents') }}</h2>
                    <span class="ml-auto rounded-full border border-line bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-muted">{{ past().length }}</span>
                  </div>
                  <ul class="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    @for (event of past(); track event.id) { <li class="h-full min-w-0"><app-feed-event-card [event]="event" /></li> }
                  </ul>
                </section>
              }
            }
          }
        }
      }
    </div>
  `,
})
export class PersonPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly social = inject(SocialRepository);
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);
  private readonly linkCopy = inject(LinkCopyService);
  private readonly title = inject(Title);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly id = input('');

  protected readonly state = signal<State>('loading');
  protected readonly limited = signal<FeedPerson | null>(null);
  protected readonly detail = signal<ProfileDetail | null>(null);
  protected readonly past = signal<FeedEvent[]>([]);
  protected readonly busy = signal(false);
  protected readonly person = computed<FeedPerson | null>(() => this.detail() ?? this.limited());

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) untracked(() => void this.load(id));
    });
  }

  protected async load(id = this.id()): Promise<void> {
    if (!this.browser) {
      this.state.set('loading');
      return;
    }
    this.state.set('loading');
    try {
      const host = await this.auth.restoreSession();
      if (host) {
        const [detail, past] = await Promise.all([this.social.profile(id), this.social.profileEvents(id, true)]);
        this.detail.set(detail);
        this.past.set(past.items);
      } else {
        this.limited.set(await this.social.publicProfile(id));
      }
      this.title.setTitle(`${this.person()?.display_name ?? ''} · Conto Contigo`);
      this.state.set('ready');
    } catch (error: unknown) {
      this.state.set(toApiError(error).status === 404 ? 'not_found' : 'error');
    }
  }

  private async act(action: () => Promise<unknown>, key: 'block12.friends.requested' | 'block12.friends.accepted' | 'block12.friends.removed'): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await action();
      this.toasts.success(this.i18n.t(key));
      this.detail.set(await this.social.profile(this.id()));
    } catch (error: unknown) {
      const apiError = toApiError(error);
      this.toasts.error(apiError.code === 'friend_request_limit' ? this.i18n.t('block12.friends.limit') : this.i18n.t('block12.common.error'));
    } finally {
      this.busy.set(false);
    }
  }

  protected addFriend(): Promise<void> {
    return this.act(() => this.social.requestFriend(this.id()), 'block12.friends.requested');
  }

  protected respond(accept: boolean): Promise<void> {
    const id = this.detail()?.friendship.id;
    return id ? this.act(() => this.social.respond(id, accept), 'block12.friends.accepted') : Promise.resolve();
  }

  protected removeFriendship(): Promise<void> {
    const id = this.detail()?.friendship.id;
    return id ? this.act(() => this.social.remove(id), 'block12.friends.removed') : Promise.resolve();
  }

  protected async shareProfile(): Promise<void> {
    if (!this.browser || !this.id()) return;
    await this.linkCopy.copy(`${window.location.origin}/pessoas/${encodeURIComponent(this.id())}`);
  }
}
