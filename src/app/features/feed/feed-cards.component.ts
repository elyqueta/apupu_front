import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FeedCommunity,
  FeedInstitution, FeedEvent, FeedPerson } from '../../core/data/social.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { TemplateArtworkComponent } from '../../shared/components/template-artwork.component';

/** Caminho interno do link aberto (`/e/:slug`) a partir do URL absoluto. */
export function eventPath(event: Pick<FeedEvent, 'slug'>): string {
  return `/e/${event.slug}`;
}

/**
 * Cartão de evento do feed (Bloco 12): capa a toda a largura (sem texto
 * por cima da imagem principal), pílula translúcida com quem organiza e
 * contagem de confirmados só quando o anfitrião a tornou pública.
 */
@Component({
  selector: 'app-feed-event-card',
  imports: [RouterLink, FaIconComponent, TemplateArtworkComponent],
  template: `
    <article
      class="group flex h-full min-w-0 flex-col overflow-hidden rounded-4xl border border-line bg-surface shadow-card transition hover:border-brand/40"
      [attr.data-testid]="'feed-event-' + event().id"
    >
      <a [routerLink]="path()" class="relative block aspect-[4/3] overflow-hidden bg-surface-raised" [attr.aria-label]="event().title">
        @if (event().cover_url) {
          <img [src]="event().cover_url" [alt]="event().title" class="size-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
        } @else {
          <app-template-artwork [templateId]="event().template.id" variant="cover" [title]="event().title" class="block size-full" />
        }
        <span class="absolute left-3 top-3 inline-flex max-w-[75%] items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
          <fa-icon [icon]="icons['calendar']" aria-hidden="true" />
          <span class="truncate">{{ dateLabel() }}</span>
        </span>
        @if (event().attendee_count !== undefined) {
          <span class="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
            <fa-icon [icon]="icons['guests']" aria-hidden="true" />
            {{ i18n.t('block12.feed.confirmed', { count: event().attendee_count ?? 0 }) }}
          </span>
        }
      </a>
      <div class="flex flex-1 flex-col gap-2 p-4">
        <h3 class="line-clamp-2 font-display text-base font-semibold leading-snug text-ink" [title]="event().title">{{ event().title }}</h3>
        <p class="flex min-w-0 items-center gap-1.5 text-xs text-muted">
          <fa-icon [icon]="icons[event().online ? 'globe' : 'location']" aria-hidden="true" />
          <span class="truncate">{{ event().online ? i18n.t('block12.feed.online') : event().location || '—' }}</span>
        </p>
        <p class="truncate text-xs text-muted">
          @if (event().community; as community) {
            <a [routerLink]="['/comunidade', community.slug]" class="font-semibold text-brand-strong hover:underline">{{ community.name }}</a>
            ·
          }
          {{ i18n.t('block12.feed.byHost', { name: event().host_name }) }}
        </p>
        <a [routerLink]="path()" class="ui-btn mt-auto w-full" [attr.data-testid]="'feed-event-open-' + event().id">
          {{ i18n.t('block12.feed.viewEvent') }}
          <fa-icon [icon]="icons['chevronRight']" aria-hidden="true" />
        </a>
      </div>
    </article>
  `,
})
export class FeedEventCardComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  readonly event = input.required<FeedEvent>();
  protected readonly path = computed(() => eventPath(this.event()));
  protected readonly dateLabel = computed(() => this.i18n.dateTime(this.event().starts_at, this.event().timezone));
}

@Component({
  selector: 'app-feed-community-card',
  imports: [RouterLink, FaIconComponent],
  template: `
    <article class="flex h-full min-w-0 flex-col overflow-hidden rounded-4xl border border-line bg-surface shadow-card transition hover:border-brand/40" [attr.data-testid]="'feed-community-' + community().slug">
      <div class="relative h-24 shrink-0 bg-gradient-to-br from-brand/35 via-surface-raised to-surface">
        @if (community().cover_url) {
          <img [src]="community().cover_url" alt="" class="size-full object-cover" loading="lazy" />
        }
        <span class="absolute -bottom-6 left-4 grid size-12 place-items-center overflow-hidden rounded-2xl border-2 border-surface bg-surface-raised text-lg font-semibold text-brand-strong shadow-card">
          @if (community().avatar_url) {
            <img [src]="community().avatar_url" alt="" class="size-full object-cover" />
          } @else {
            {{ community().name.charAt(0).toUpperCase() }}
          }
        </span>
      </div>
      <div class="flex flex-1 flex-col gap-2 p-4 pt-8">
        <h3 class="line-clamp-2 font-display text-base font-semibold text-ink">{{ community().name }}</h3>
        <p class="line-clamp-2 min-h-10 text-xs leading-5 text-muted">{{ community().description || '' }}</p>
        <p class="flex items-center gap-2 text-xs text-muted">
          <span class="ui-chip"><fa-icon [icon]="icons['globe']" aria-hidden="true" /> {{ i18n.t('block12.feed.public') }}</span>
          {{ i18n.t('block12.feed.members', { count: community().member_count }) }}
        </p>
        <a [routerLink]="['/comunidade', community().slug]" class="ui-btn-secondary mt-auto w-full">{{ i18n.t('block12.feed.viewCommunity') }}</a>
      </div>
    </article>
  `,
})
export class FeedCommunityCardComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  readonly community = input.required<FeedCommunity>();
}

/** Bloco 13: cartão de instituição (mesmo tamanho dos de comunidade). */
@Component({
  selector: 'app-feed-institution-card',
  imports: [RouterLink, FaIconComponent],
  template: `
    <article class="flex h-full min-w-0 flex-col overflow-hidden rounded-4xl border border-line bg-surface shadow-card transition hover:border-brand/40" [attr.data-testid]="'feed-institution-' + institution().slug">
      <div class="relative h-24 shrink-0 bg-gradient-to-br from-amber/35 via-surface-raised to-surface">
        @if (institution().cover_url) {
          <img [src]="institution().cover_url" alt="" class="size-full object-cover" loading="lazy" />
        }
        <span class="absolute -bottom-6 left-4 grid size-12 place-items-center overflow-hidden rounded-2xl border-2 border-surface bg-surface-raised text-lg font-semibold text-brand-strong shadow-card">
          @if (institution().avatar_url) {
            <img [src]="institution().avatar_url" alt="" class="size-full object-cover" />
          } @else {
            <fa-icon [icon]="icons['bank']" aria-hidden="true" />
          }
        </span>
      </div>
      <div class="flex flex-1 flex-col gap-2 p-4 pt-8">
        <h3 class="line-clamp-2 font-display text-base font-semibold text-ink">{{ institution().name }}</h3>
        <p class="line-clamp-2 min-h-10 text-xs leading-5 text-muted">{{ institution().description || '' }}</p>
        <p class="flex items-center gap-2 text-xs text-muted">
          <span class="ui-chip"><fa-icon [icon]="icons['bank']" aria-hidden="true" /> {{ i18n.t('block13.feed.institution') }}</span>
          {{ i18n.t('block13.list.communities', { count: institution().community_count }) }}
        </p>
        <a [routerLink]="['/instituicoes', institution().slug]" class="ui-btn-secondary mt-auto w-full">{{ i18n.t('block13.list.open') }}</a>
      </div>
    </article>
  `,
})
export class FeedInstitutionCardComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  readonly institution = input.required<FeedInstitution>();
}

/** Pessoa: sem conta, o clique abre o convite a criar conta (`open`). */
@Component({
  selector: 'app-feed-person-card',
  imports: [AvatarComponent],
  template: `
    <article class="flex h-full min-w-0 flex-col items-center gap-3 rounded-4xl border border-line bg-surface p-4 text-center shadow-card" [attr.data-testid]="'feed-person-' + person().id">
      <app-avatar [name]="person().display_name || '?'" [imageUrl]="person().avatar_url" size="xl" />
      <h3 class="line-clamp-2 font-display text-base font-semibold text-ink">{{ person().display_name }}</h3>
      <button type="button" class="ui-btn-secondary mt-auto w-full" (click)="open.emit(person())">{{ i18n.t('block12.feed.viewProfile') }}</button>
    </article>
  `,
})
export class FeedPersonCardComponent {
  protected readonly i18n = inject(I18nService);
  readonly person = input.required<FeedPerson>();
  readonly open = output<FeedPerson>();
}
