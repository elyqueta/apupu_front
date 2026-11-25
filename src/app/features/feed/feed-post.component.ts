import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FeedEvent } from '../../core/data/social.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { ShareService } from '../../core/services/share.service';
import { ICONS } from '../../core/ui/icons';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { TemplateArtworkComponent } from '../../shared/components/template-artwork.component';
import { LinkCopyService } from '../../shared/services/link-copy.service';

/**
 * Publicação de evento no feed (Bloco 12, segundo as referências visuais):
 *
 * - **mobile** (`< lg`): cartão imersivo — a imagem ocupa o cartão, pílula
 *   de vidro com quem organiza, botão ⋮ circular translúcido e legenda com
 *   contadores sobre um gradiente na base;
 * - **desktop** (`lg+`): publicação clássica — cabeçalho com avatar, nome e
 *   tempo, texto com etiquetas, imagem grande arredondada e barra de ações.
 *
 * O ⋮ abre um bottom sheet com "Ver evento", "Copiar link" e "WhatsApp".
 */
@Component({
  selector: 'app-feed-post',
  imports: [RouterLink, FaIconComponent, AvatarComponent, ModalComponent, StatusBadgeComponent, TemplateArtworkComponent],
  template: `
    <!-- Mobile: imersivo -->
    <article
      class="relative isolate overflow-hidden rounded-[2rem] bg-surface-raised shadow-card lg:hidden"
      [attr.data-testid]="'feed-post-' + event().id"
    >
      <div class="relative aspect-[4/5] w-full">
        @if (event().cover_url) {
          <img [src]="event().cover_url" [alt]="event().title" class="absolute inset-0 size-full object-cover" loading="lazy" />
        } @else {
          <app-template-artwork [templateId]="event().template.id" variant="cover" title="" class="absolute inset-0 block size-full" />
        }
        <!-- Link a toda a área; as pílulas ficam por cima (z-10). -->
        <a [routerLink]="path()" class="absolute inset-0" [attr.aria-label]="i18n.t('block12.feed.viewEvent') + ': ' + event().title" [attr.data-testid]="'feed-event-open-' + event().id"></a>

        <div class="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
          <span class="pointer-events-auto inline-flex min-w-0 max-w-[78%] items-center gap-2 rounded-full border border-white/20 bg-black/35 py-1 pl-1 pr-3 text-white backdrop-blur-md">
            <app-avatar [name]="event().host_name" [imageUrl]="event().host_avatar_url ?? null" size="sm" />
            <span class="min-w-0">
              <span class="flex items-center gap-1 truncate text-sm font-semibold leading-tight">
                {{ event().host_name }}
                @if (event().community) {
                  <fa-icon [icon]="icons['userCheck']" class="shrink-0 text-xs text-sky-300" aria-hidden="true" />
                }
              </span>
              <span class="block truncate text-xs text-white/75">{{ subline() }}</span>
            </span>
          </span>
          <button
            type="button"
            class="pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition hover:bg-black/50"
            [attr.aria-label]="i18n.t('common.moreActions')"
            (click)="menuOpen.set(true)"
          >
            <fa-icon [icon]="icons['ellipsisVertical']" aria-hidden="true" />
          </button>
        </div>

        <div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 pt-16 text-white">
          <p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold">
            <span class="inline-flex items-center gap-1.5"><fa-icon [icon]="icons['calendar']" aria-hidden="true" /> {{ dateLabel() }}</span>
            @if (event().attendee_count !== undefined) {
              <span class="inline-flex items-center gap-1.5"><fa-icon [icon]="icons['heart']" aria-hidden="true" /> {{ event().attendee_count }}</span>
            }
            <span class="inline-flex items-center gap-1.5"><fa-icon [icon]="icons[event().online ? 'globe' : 'location']" aria-hidden="true" /> <span class="max-w-[10rem] truncate">{{ place() }}</span></span>
          </p>
          @if (event().status) {
            <div class="mt-2"><app-status-badge [value]="event().status!" /></div>
          }
          <h3 class="mt-2 line-clamp-2 font-display text-lg font-semibold leading-snug">{{ event().title }}</h3>
          @if (caption()) {
            <p class="mt-1 line-clamp-2 text-sm text-white/85">{{ caption() }}</p>
          }
          <p class="mt-1 text-sm font-medium text-sky-200">{{ tags() }}</p>
        </div>
      </div>
    </article>

    <!-- Desktop: publicação clássica -->
    <article class="hidden rounded-4xl border border-line bg-surface p-5 shadow-card lg:block" [attr.data-testid]="'feed-post-desktop-' + event().id">
      <header class="flex items-center gap-3">
        <app-avatar [name]="event().host_name" [imageUrl]="event().host_avatar_url ?? null" size="md" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-ink">
            {{ event().host_name }}
            @if (event().community; as community) {
              <span class="font-normal text-muted"> · </span>
              <a [routerLink]="['/comunidade', community.slug]" class="font-semibold text-brand-strong hover:underline">{{ community.name }}</a>
            }
          </p>
          <p class="text-xs text-muted">{{ subline() }}</p>
        </div>
        <button type="button" class="ui-icon-button" [attr.aria-label]="i18n.t('common.moreActions')" (click)="menuOpen.set(true)">
          <fa-icon [icon]="icons['ellipsisVertical']" aria-hidden="true" />
        </button>
      </header>

      <div class="mt-3">
        @if (event().status) {
          <div class="mb-2"><app-status-badge [value]="event().status!" /></div>
        }
        <h3 class="font-display text-lg font-semibold text-ink">{{ event().title }}</h3>
        @if (caption()) {
          <p class="mt-1 line-clamp-3 text-sm leading-6 text-ink/90">{{ caption() }}</p>
        }
        <p class="mt-1 text-sm font-medium text-brand-strong">{{ tags() }}</p>
      </div>

      <a [routerLink]="path()" class="mt-3 block overflow-hidden rounded-3xl bg-surface-raised" [attr.aria-label]="i18n.t('block12.feed.viewEvent') + ': ' + event().title">
        @if (event().cover_url) {
          <img [src]="event().cover_url" [alt]="event().title" class="aspect-[16/9] w-full object-cover transition duration-500 hover:scale-[1.02]" loading="lazy" />
        } @else {
          <app-template-artwork [templateId]="event().template.id" variant="cover" title="" class="block aspect-[16/9] w-full" />
        }
      </a>

      <footer class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
        <span class="inline-flex items-center gap-1.5"><fa-icon [icon]="icons['calendar']" class="text-brand" aria-hidden="true" /> {{ dateLabel() }}</span>
        <span class="inline-flex min-w-0 items-center gap-1.5"><fa-icon [icon]="icons[event().online ? 'globe' : 'location']" class="text-brand" aria-hidden="true" /> <span class="max-w-[14rem] truncate">{{ place() }}</span></span>
        @if (event().attendee_count !== undefined) {
          <span class="inline-flex items-center gap-1.5"><fa-icon [icon]="icons['heart']" class="text-coral" aria-hidden="true" /> {{ i18n.t('block12.feed.confirmed', { count: event().attendee_count ?? 0 }) }}</span>
        }
        <span class="ml-auto flex items-center gap-2">
          <button type="button" class="ui-icon-button" [attr.aria-label]="i18n.t('block10.copy.link')" [attr.title]="i18n.t('block10.copy.link')" (click)="copy()">
            <fa-icon [icon]="icons['copy']" aria-hidden="true" />
          </button>
          <button type="button" class="ui-icon-button" [attr.aria-label]="i18n.t('block10.publicLink.whatsapp')" [attr.title]="i18n.t('block10.publicLink.whatsapp')" (click)="whatsapp()">
            <fa-icon [icon]="icons['whatsapp']" aria-hidden="true" />
          </button>
          <a [routerLink]="path()" class="ui-btn" [attr.data-testid]="'feed-event-open-desktop-' + event().id">{{ i18n.t('block12.feed.viewEvent') }}</a>
        </span>
      </footer>
    </article>

    <app-modal [open]="menuOpen()" [title]="event().title" presentation="sheet" size="sm" (closed)="menuOpen.set(false)">
      <div class="flex flex-col gap-1">
        <a [routerLink]="path()" class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-surface-raised" (click)="menuOpen.set(false)">
          <fa-icon [icon]="icons['calendar']" class="w-4 text-brand" aria-hidden="true" /> {{ i18n.t('block12.feed.viewEvent') }}
        </a>
        <button type="button" class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-ink hover:bg-surface-raised" (click)="copy(); menuOpen.set(false)">
          <fa-icon [icon]="icons['copy']" class="w-4 text-brand" aria-hidden="true" /> {{ i18n.t('block10.copy.link') }}
        </button>
        <button type="button" class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-ink hover:bg-surface-raised" (click)="whatsapp(); menuOpen.set(false)">
          <fa-icon [icon]="icons['whatsapp']" class="w-4 text-brand" aria-hidden="true" /> {{ i18n.t('block10.publicLink.whatsapp') }}
        </button>
        @if (event().community; as community) {
          <a [routerLink]="['/comunidade', community.slug]" class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-surface-raised" (click)="menuOpen.set(false)">
            <fa-icon [icon]="icons['globe']" class="w-4 text-brand" aria-hidden="true" /> {{ community.name }}
          </a>
        }
      </div>
    </app-modal>
  `,
})
export class FeedPostComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly share = inject(ShareService);
  private readonly linkCopy = inject(LinkCopyService);

  readonly event = input.required<FeedEvent>();
  protected readonly menuOpen = signal(false);

  protected readonly path = computed(() => `/e/${this.event().slug}`);
  protected readonly dateLabel = computed(() => this.i18n.dateTime(this.event().starts_at, this.event().timezone));
  protected readonly place = computed(() =>
    this.event().online ? this.i18n.t('block12.feed.online') : this.event().location || '—',
  );
  /** "Comunidade · há 2 dias" ou "há 2 dias". */
  protected readonly subline = computed(() => {
    const published = this.event().published_at;
    const ago = published ? this.i18n.relative(published) : '';
    const community = this.event().community?.name;
    return [community, ago].filter(Boolean).join(' · ');
  });
  protected readonly caption = computed(() => (this.event().excerpt ?? '').replace(/\s+/g, ' ').trim());
  /** Etiquetas como nas referências: categoria e comunidade. */
  protected readonly tags = computed(() => {
    const parts: string[] = [];
    const category = this.event().category;
    if (category) parts.push(`#${this.i18n.t(`type.${category}` as never).toLowerCase().replace(/\s+/g, '')}`);
    const community = this.event().community?.name;
    if (community) parts.push(`#${community.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')}`);
    parts.push(this.event().online ? '#online' : '#evento');
    return parts.join(' ');
  });

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
