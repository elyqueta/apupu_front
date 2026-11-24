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
        <div class="flex items-center gap-1">
          <a routerLink="/" class="ui-icon-button" [attr.aria-label]="i18n.t('block12.feed.title')">
            <fa-icon [icon]="icons['chevronLeft']" aria-hidden="true" />
          </a>
          <app-brand />
        </div>
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
            <article class="overflow-hidden rounded-4xl border border-line bg-surface shadow-card">
              <div class="h-32 bg-gradient-to-br from-brand/35 via-surface-raised to-surface sm:h-44">
                @if (p.cover_url) { <img [src]="p.cover_url" alt="" class="size-full object-cover" /> }
              </div>
              <div class="flex flex-col gap-3 p-4 pt-0 sm:flex-row sm:items-end sm:justify-between sm:p-6 sm:pt-0">
                <div class="flex items-end gap-3">
                  <app-avatar class="-mt-10 rounded-full border-4 border-surface" [name]="p.display_name || '?'" [imageUrl]="p.avatar_url" size="2xl" />
                  <div class="pb-1">
                    <h1 class="font-display text-2xl font-semibold text-ink">{{ p.display_name }}</h1>
                    @if (detail(); as d) {
                      <p class="text-xs text-muted">
                        {{ i18n.t('block12.profile.friends', { count: d.friend_count }) }}
                        @if (d.mutual_friends.total > 0) { · {{ i18n.t('block12.profile.mutualFriends', { count: d.mutual_friends.total }) }} }
                      </p>
                    }
                  </div>
                </div>
                @if (detail(); as d) {
                  @if (d.is_self) {
                    <a routerLink="/perfil" class="ui-btn-secondary">{{ i18n.t('block12.profile.editProfile') }}</a>
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
                }
              </div>
            </article>

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
              @if (d.mutual_communities.length > 0) {
                <section>
                  <h2 class="mb-2 text-sm font-semibold text-ink">{{ i18n.t('block12.profile.mutualCommunities') }}</h2>
                  <div class="flex flex-wrap gap-2">
                    @for (community of d.mutual_communities; track community.id) {
                      <a [routerLink]="['/comunidades', community.slug]" class="ui-chip-interactive">{{ community.name }}</a>
                    }
                  </div>
                </section>
              }
              <section>
                <h2 class="mb-2 text-sm font-semibold text-ink">{{ i18n.t('block12.profile.events') }}</h2>
                @if (d.events.length === 0) {
                  <p class="text-sm text-muted">{{ i18n.t('block12.profile.noEvents') }}</p>
                } @else {
                  <ul class="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    @for (event of d.events; track event.id) { <li class="h-full min-w-0"><app-feed-event-card [event]="event" /></li> }
                  </ul>
                }
              </section>
              @if (d.communities.length > 0) {
                <section>
                  <h2 class="mb-2 text-sm font-semibold text-ink">{{ i18n.t('block12.profile.communities') }}</h2>
                  <ul class="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    @for (community of d.communities; track community.id) { <li class="h-full min-w-0"><app-feed-community-card [community]="community" /></li> }
                  </ul>
                </section>
              }
              @if (past().length > 0) {
                <section data-testid="person-past-events">
                  <h2 class="mb-2 text-sm font-semibold text-ink">{{ i18n.t('block12.profile.pastEvents') }}</h2>
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
}
