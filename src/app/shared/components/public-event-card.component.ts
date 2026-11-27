import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FeedEvent } from '../../core/data/social.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ShareService } from '../../core/services/share.service';
import { ICONS } from '../../core/ui/icons';
import { LinkCopyService } from '../services/link-copy.service';
import { ActionMenuComponent, ActionMenuItem } from './action-menu.component';
import { AvatarComponent } from './avatar.component';
import { ImageLightboxComponent } from './image-lightbox.component';
import { TemplateArtworkComponent } from './template-artwork.component';

/**
 * Cartão de evento único das páginas públicas (feed, comunidade e perfil).
 *
 * A capa é sempre um flyer: a imagem aparece inteira, sem textos ou selos por
 * cima, dentro de um fundo sólido. Quando não há capa, usa-se a miniatura do
 * modelo como flyer. Toda a informação textual fica num bloco abaixo da imagem.
 *
 * A variante `compact` só ajusta a altura do flyer para grelhas; não existe um
 * modo imersivo com vidro sobre a imagem.
 */
@Component({
  selector: 'app-public-event-card',
  imports: [
    RouterLink,
    FaIconComponent,
    AvatarComponent,
    ActionMenuComponent,
    ImageLightboxComponent,
    TemplateArtworkComponent,
  ],
  template: `
    <article
      class="group flex h-full min-w-0 flex-col overflow-hidden rounded-4xl border border-line/40 bg-surface shadow-card transition duration-200 hover:border-brand/40 focus-within:border-brand/50"
      [attr.data-testid]="'feed-event-' + event().id"
    >
      <header class="flex min-w-0 items-center gap-3 border-b border-line/40 bg-surface px-3 py-2.5 sm:px-4">
        <app-avatar
          [name]="event().host_name"
          [imageUrl]="event().host_avatar_url ?? null"
          size="sm"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-semibold text-ink">{{ event().host_name }}</p>
          <p class="truncate text-xs text-muted">{{ authorMeta() }}</p>
        </div>
        <app-action-menu
          [items]="menuItems()"
          [triggerLabel]="i18n.t('common.moreActions')"
          [triggerTestId]="'feed-event-options-' + event().id"
          [plainTrigger]="true"
          [vertical]="true"
          (selected)="onMenu($event)"
        />
      </header>

      <button
        type="button"
        class="block w-full shrink-0 bg-surface-raised"
        [class]="flyerClass()"
        [attr.aria-label]="i18n.t('block15.feed.openFlyer', { title: event().title })"
        [attr.data-testid]="'feed-event-flyer-' + event().id"
        (click)="openFlyer()"
      >
        @if (event().cover_url) {
          <img
            [src]="event().cover_url"
            [alt]="event().title"
            class="mx-auto block size-full object-contain"
            loading="lazy"
          />
        } @else {
          <app-template-artwork
            [templateId]="event().template.id"
            [videoId]="event().youtube_video_id ?? null"
            variant="hero"
            [title]="event().title"
            [showIcon]="false"
            class="block size-full"
          />
        }
      </button>

      <div class="flex flex-1 flex-col gap-2 bg-surface p-3 text-sm sm:p-4">
        <a
          [routerLink]="path()"
          class="line-clamp-2 break-words font-display text-base font-semibold leading-snug text-ink transition hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          [attr.data-testid]="'feed-event-open-' + event().id"
        >
          {{ event().title }}
        </a>

        <div class="flex min-w-0 items-center gap-2">
          @if (event().status) {
            <span
              class="inline-flex min-h-7 shrink-0 items-center rounded-full border border-brand/30 bg-brand/10 px-2.5 text-xs font-semibold text-brand-strong"
              [attr.data-testid]="'feed-event-status-' + event().id"
            >
              {{ i18n.t(statusLabel()) }}
            </span>
          }
          <span class="min-w-0 truncate text-xs text-muted">
            <fa-icon [icon]="icons['calendar']" class="mr-1 shrink-0 text-brand" aria-hidden="true" />
            {{ dateAndPlace() }}
          </span>
        </div>

        @if (visibleTags().length > 0) {
          <p
            class="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-brand-strong"
            [attr.data-testid]="'feed-event-tags-' + event().id"
          >
            @for (tag of visibleTags(); track tag) {
              <span class="truncate">{{ tag }}</span>
            }
            @if (extraTags() > 0) {
              <span class="shrink-0">+{{ extraTags() }}</span>
            }
          </p>
        }

        <div class="mt-auto flex min-w-0 flex-nowrap items-center gap-1 border-t border-line/40 pt-2">
          <span class="inline-flex items-center gap-1" [attr.title]="i18n.t('block15.feed.reactionsUnavailable')">
            <button
              type="button"
              class="ui-icon-button"
              disabled
              aria-disabled="true"
              [attr.aria-label]="i18n.t('block15.feed.react')"
              [attr.title]="i18n.t('block15.feed.reactionsUnavailable')"
            >
              <fa-icon [icon]="icons['heart']" aria-hidden="true" />
            </button>
            <span class="text-xs text-muted">0</span>
          </span>
          <span class="inline-flex items-center gap-1" [attr.title]="i18n.t('block15.feed.commentsUnavailable')">
            <button
              type="button"
              class="ui-icon-button"
              disabled
              aria-disabled="true"
              [attr.aria-label]="i18n.t('block15.feed.comment')"
              [attr.title]="i18n.t('block15.feed.commentsUnavailable')"
            >
              <fa-icon [icon]="icons['comment']" aria-hidden="true" />
            </button>
            <span class="text-xs text-muted">0</span>
          </span>
          <button
            type="button"
            class="ui-icon-button"
            [attr.aria-label]="i18n.t('block15.feed.share')"
            [attr.title]="i18n.t('block15.feed.share')"
            [attr.data-testid]="'feed-event-share-' + event().id"
            (click)="copy()"
          >
            <fa-icon [icon]="icons['share']" aria-hidden="true" />
          </button>
          <a
            [routerLink]="path()"
            class="ui-btn ml-auto min-h-11 shrink-0 whitespace-nowrap"
            [attr.aria-label]="i18n.t('block12.feed.viewEvent') + ': ' + event().title"
            [attr.data-testid]="'feed-event-cta-' + event().id"
          >
            {{ i18n.t('block12.feed.viewEvent') }}
          </a>
        </div>
      </div>

      <app-image-lightbox
        [src]="lightboxSrc()"
        [alt]="event().title"
        [closeLabel]="i18n.t('common.close')"
        (closed)="lightboxSrc.set(null)"
      />
    </article>
  `,
})
export class PublicEventCardComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly linkCopy = inject(LinkCopyService);
  private readonly share = inject(ShareService);
  private readonly router = inject(Router);

  readonly event = input.required<FeedEvent>();
  /** Só altera a altura do flyer; o cartão continua a ser o mesmo em todas as páginas. */
  readonly variant = input<'default' | 'compact'>('default');
  /** Substitui o link partilhado (ex.: link com código de indicação da comunidade). */
  readonly shareUrl = input<string | null>(null);
  /** Quando presente, acrescenta "Editar" ao menu (gestão da comunidade). */
  readonly editPath = input<string | null>(null);

  protected readonly lightboxSrc = signal<string | null>(null);

  protected readonly path = computed(() => `/e/${this.event().slug}`);
  protected readonly flyerClass = computed(() =>
    this.variant() === 'compact'
      ? 'h-56 sm:h-64'
      : 'h-[min(80dvh,32rem)] sm:h-[26rem] xl:h-[30rem]',
  );
  protected readonly authorMeta = computed(() => {
    const community = this.event().community?.name?.trim();
    const published = this.event().published_at;
    const when = published
      ? this.i18n.relative(published)
      : this.i18n.shortDate(this.event().starts_at, this.event().timezone);
    return community ? `${community} · ${when}` : when;
  });
  protected readonly place = computed(() =>
    this.event().online ? this.i18n.t('block12.feed.online') : this.event().location || '—',
  );
  protected readonly dateAndPlace = computed(() =>
    `${this.i18n.shortDate(this.event().starts_at, this.event().timezone)} · ${this.place()}`,
  );
  protected readonly statusLabel = computed<TranslationKey>(() => {
    const status = this.event().status;
    if (!status || status === 'published' || status === 'scheduled') return 'block15.status.active';
    if (status === 'completed') return 'block15.status.completed';
    if (status === 'cancelled') return 'block15.status.cancelled';
    return `status.${status}` as TranslationKey;
  });
  private readonly allTags = computed(() => {
    const found = (this.event().excerpt ?? '').match(/#[\p{L}\d_]+/gu) ?? [];
    return [...new Set(found)];
  });
  protected readonly visibleTags = computed(() => this.allTags().slice(0, 2));
  protected readonly extraTags = computed(() => Math.max(0, this.allTags().length - 2));
  protected readonly menuItems = computed<ActionMenuItem[]>(() => [
    ...(this.editPath()
      ? [{ id: 'edit', label: this.i18n.t('common.edit'), icon: this.icons['pen'] }]
      : []),
    { id: 'open', label: this.i18n.t('block12.feed.viewEvent'), icon: this.icons['arrowUpRight'] },
    { id: 'copy', label: this.i18n.t('block10.copy.link'), icon: this.icons['copy'] },
    {
      id: 'whatsapp',
      label: this.i18n.t('block10.publicLink.whatsapp'),
      icon: this.icons['whatsapp'],
    },
  ]);

  protected openFlyer(): void {
    this.lightboxSrc.set(this.event().cover_url);
  }

  protected onMenu(id: string): void {
    if (id === 'edit') {
      const path = this.editPath();
      if (path) void this.router.navigateByUrl(path);
      return;
    }
    if (id === 'open') {
      void this.router.navigateByUrl(this.path());
      return;
    }
    if (id === 'copy') {
      this.copy();
      return;
    }
    if (id === 'whatsapp') this.whatsapp();
  }

  protected copy(): void {
    void this.linkCopy.copy(this.shareUrl() ?? this.event().public_url);
  }

  protected whatsapp(): void {
    const text = this.i18n.t('block10.publicLink.whatsappMessage', {
      event: this.event().title,
      url: this.shareUrl() ?? this.event().public_url,
    });
    this.share.openExternal(this.share.whatsappShareUrl(text));
  }
}
