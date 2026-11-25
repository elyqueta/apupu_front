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
import { BrandComponent } from '../../shared/components/brand.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { FeedEventCardComponent } from './feed-cards.component';

type State = 'loading' | 'ready' | 'not_found' | 'error';

/**
 * Comunidade pública em modo limitado (`/comunidade/:slug`, Bloco 12):
 * acessível sem conta, sem lista de membros. Com conta mostra também os
 * eventos anteriores e o atalho para a página completa da comunidade.
 */
@Component({
  selector: 'app-public-community-page',
  imports: [RouterLink, FaIconComponent, BrandComponent, SkeletonComponent, FeedEventCardComponent],
  template: `
    <div class="mx-auto flex min-h-dvh max-w-6xl flex-col gap-4 px-4 pb-16 pt-4 sm:px-6">
      <header class="flex items-center justify-between gap-3">
        <a routerLink="/" class="ui-icon-button" [attr.aria-label]="i18n.t('block12.feed.title')">
          <fa-icon [icon]="icons['chevronLeft']" aria-hidden="true" />
        </a>
        <app-brand />
      </header>
      @switch (state()) {
        @case ('loading') { <app-skeleton variant="detail" /> }
        @case ('not_found') {
          <p class="rounded-4xl border border-line bg-surface p-8 text-center text-sm font-semibold text-ink" data-testid="public-community-not-found">{{ i18n.t('block12.community.notFound') }}</p>
        }
        @case ('error') {
          <div class="rounded-4xl border border-coral/30 bg-coral/10 p-6 text-center" role="alert">
            <p class="text-sm font-semibold text-coral">{{ i18n.t('block12.common.error') }}</p>
            <button type="button" class="ui-btn-secondary mt-3" (click)="load()">{{ i18n.t('block12.feed.retry') }}</button>
          </div>
        }
        @case ('ready') {
          @if (community(); as c) {
            <article class="overflow-hidden rounded-4xl border border-line bg-surface shadow-card">
              <div class="h-32 bg-gradient-to-br from-brand/35 via-surface-raised to-surface sm:h-44">
                @if (c.cover_url) { <img [src]="c.cover_url" alt="" class="size-full object-cover" /> }
              </div>
              <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                <div class="min-w-0">
                  <h1 class="break-words font-display text-2xl font-semibold text-ink">{{ c.name }}</h1>
                  <p class="mt-1 text-xs text-muted">{{ i18n.t('block12.feed.public') }} · {{ i18n.t('block12.feed.members', { count: c.member_count }) }}</p>
                  @if (c.description) { <p class="mt-2 text-sm leading-6 text-muted">{{ c.description }}</p> }
                </div>
                @if (signedIn()) {
                  <a [routerLink]="['/comunidades', c.slug]" class="ui-btn shrink-0" data-testid="public-community-open">{{ i18n.t('block12.community.openFull') }}</a>
                } @else {
                  <a routerLink="/entrar" [queryParams]="{ returnUrl: '/comunidades/' + c.slug }" class="ui-btn shrink-0">{{ i18n.t('block12.feed.login') }}</a>
                }
              </div>
            </article>
            @if (!signedIn()) {
              <p class="rounded-3xl border border-brand/25 bg-brand/10 p-4 text-sm text-ink">{{ i18n.t('block12.community.limited') }}</p>
            }
            <section>
              <h2 class="mb-2 text-sm font-semibold text-ink">{{ i18n.t('block12.profile.events') }}</h2>
              @if (c.events.length === 0) {
                <div class="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
                  <span class="grid size-12 place-items-center rounded-2xl border border-brand/20 bg-brand/10 text-brand-strong">
                    <fa-icon [icon]="icons['events']" class="text-lg" aria-hidden="true" />
                  </span>
                  <p class="text-sm text-muted">{{ i18n.t('block12.profile.noEvents') }}</p>
                </div>
              } @else {
                <ul class="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
                  @for (event of c.events; track event.id) { <li class="h-full min-w-0"><app-feed-event-card [event]="event" /></li> }
                </ul>
              }
            </section>
            @if (past().length > 0) {
              <section data-testid="public-community-past">
                <h2 class="mb-2 text-sm font-semibold text-ink">{{ i18n.t('block12.profile.pastEvents') }}</h2>
                <ul class="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
                  @for (event of past(); track event.id) { <li class="h-full min-w-0"><app-feed-event-card [event]="event" /></li> }
                </ul>
              </section>
            }
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
  protected readonly past = signal<FeedEvent[]>([]);
  protected readonly signedIn = computed(() => !!this.auth.host());

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (slug) untracked(() => void this.load(slug));
    });
  }

  protected async load(slug = this.slug()): Promise<void> {
    this.state.set('loading');
    try {
      const community = await this.social.publicCommunity(slug);
      this.community.set(community);
      this.title.setTitle(`${community.name} · Conto Contigo`);
      this.meta.updateTag({ name: 'description', content: community.description ?? community.name });
      this.state.set('ready');
      if (this.browser && (await this.auth.restoreSession())) {
        this.past.set((await this.social.communityEvents(slug, true)).items);
      }
    } catch (error: unknown) {
      this.state.set(toApiError(error).status === 404 ? 'not_found' : 'error');
    }
  }
}
