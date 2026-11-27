import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FeedEvent } from '../../core/data/social.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { ShareService } from '../../core/services/share.service';
import { ICONS } from '../../core/ui/icons';
import { LinkCopyService } from '../services/link-copy.service';
import { StatusBadgeComponent } from './status-badge.component';
import { TemplateArtworkComponent } from './template-artwork.component';

/**
 * Cartão de evento único para as páginas públicas (feed, comunidade e perfil).
 *
 * A capa ocupa sempre o cartão. Quando não existe capa, usa-se a miniatura do
 * modelo. A variante `compact` é a usada nas grelhas de comunidade/perfil.
 */
@Component({
  selector: 'app-public-event-card',
  imports: [RouterLink, FaIconComponent, StatusBadgeComponent, TemplateArtworkComponent],
  template: `
    <article
      class="group relative isolate flex h-full min-w-0 flex-col overflow-hidden rounded-4xl border border-line/40 bg-surface/60 shadow-card backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 focus-within:border-brand/50"
      [class]="variant() === 'compact' ? 'text-sm' : 'text-base'"
      [attr.data-testid]="'feed-event-' + event().id"
    >
      <a
        [routerLink]="path()"
        class="relative block w-full overflow-hidden bg-surface-raised"
        [class]="variant() === 'compact' ? 'aspect-[16/9]' : 'aspect-[16/10]'"
        [attr.aria-label]="i18n.t('block12.feed.viewEvent') + ': ' + event().title"
        [attr.data-testid]="'feed-event-open-' + event().id"
      >
        @if (event().cover_url) {
          <img
            [src]="event().cover_url"
            [alt]="event().title"
            class="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        } @else {
          <app-template-artwork
            [templateId]="event().template.id"
            [videoId]="event().youtube_video_id ?? null"
            variant="cover"
            [title]="event().title"
            [showIcon]="false"
            class="absolute inset-0 block size-full"
          />
        }

        <div class="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-2 p-3">
          <span
            class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line/40 bg-surface/85 px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur-xl"
          >
            <fa-icon [icon]="icons['calendar']" class="shrink-0 text-brand" aria-hidden="true" />
            <span class="truncate">{{ dateLabel() }}</span>
          </span>
          @if (event().status) {
            <span class="shrink-0"><app-status-badge [value]="event().status!" /></span>
          }
        </div>

        <div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-surface-solid/95 via-surface-solid/55 to-transparent p-4 pt-14">
          <h3 class="line-clamp-2 break-words font-display text-base font-semibold leading-snug text-ink">
            {{ event().title }}
          </h3>
          <p class="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted">
            <fa-icon [icon]="icons[event().online ? 'globe' : 'location']" class="mr-1.5 text-brand" aria-hidden="true" />
            {{ place() }}
          </p>
        </div>
      </a>

      <div class="flex flex-1 flex-col gap-2 p-4">
        @if (variant() === 'default' && excerpt()) {
          <p class="line-clamp-2 break-words text-sm leading-6 text-muted">{{ excerpt() }}</p>
        }
        <p class="line-clamp-2 break-words text-xs leading-5 text-muted">
          {{ i18n.t('common.by', { name: event().host_name }) }}
        </p>
        @if (event().community?.name) {
          <a
            [routerLink]="['/comunidade', event().community!.slug]"
            class="line-clamp-2 break-words text-xs font-semibold text-brand-strong hover:underline"
          >
            {{ event().community!.name }}
          </a>
        }

        <div class="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line/40 pt-3">
          @if (event().attendee_count !== undefined) {
            <span class="text-xs font-medium text-muted">
              {{ confirmedLabel() }}
            </span>
          } @else {
            <span></span>
          }
          <span class="flex items-center gap-1" [attr.data-testid]="'feed-post-menu-desktop'">
            <button
              type="button"
              class="ui-icon-button"
              [attr.aria-label]="i18n.t('block10.copy.link')"
              [attr.title]="i18n.t('block10.copy.link')"
              [attr.data-testid]="'feed-post-menu-mobile'"
              (click)="copy()"
            >
              <fa-icon [icon]="icons['copy']" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="ui-icon-button"
              [attr.aria-label]="i18n.t('block10.publicLink.whatsapp')"
              [attr.title]="i18n.t('block10.publicLink.whatsapp')"
              (click)="whatsapp()"
            >
              <fa-icon [icon]="icons['whatsapp']" aria-hidden="true" />
            </button>
          </span>
        </div>
      </div>
    </article>
  `,
})
export class PublicEventCardComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly linkCopy = inject(LinkCopyService);
  private readonly share = inject(ShareService);

  readonly event = input.required<FeedEvent>();
  readonly variant = input<'default' | 'compact'>('default');

  protected readonly path = computed(() => `/e/${this.event().slug}`);
  protected readonly dateLabel = computed(() =>
    this.i18n.dateTime(this.event().starts_at, this.event().timezone),
  );
  protected readonly place = computed(() =>
    this.event().online ? this.i18n.t('block12.feed.online') : this.event().location || '—',
  );
  protected readonly excerpt = computed(() => (this.event().excerpt ?? '').replace(/\s+/g, ' ').trim());
  protected readonly confirmedLabel = computed(() =>
    this.i18n.plural(
      this.event().attendee_count ?? 0,
      'plural.confirmed.one',
      'plural.confirmed.many',
    ),
  );

  protected copy(): void {
    void this.linkCopy.copy(this.event().public_url);
  }

  protected whatsapp(): void {
    const text = this.i18n.t('block10.publicLink.whatsappMessage', {
      event: this.event().title,
      url: this.event().public_url,
    });
    this.share.openExternal(this.share.whatsappShareUrl(text));
  }
}
