import { Component, computed, inject, input, output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { I18nService } from '../../core/i18n/i18n.service';
import { TemplateManifest, fontFamily, manifestStyle } from '../../core/models/template-manifest';
import { ActionButton, TemplateBlock, TimelineItem } from '../../core/models/template-document';
import { GratitudeInvitationComponent } from '../../features/invitation/parts/gratitude-invitation.component';
import { InvitationEventView } from '../../features/invitation/invitation.models';
import { TemplatePreviewComponent } from './template-preview.component';

export interface TemplateRenderData {
  title: string;
  /** Subtítulo editável do evento; quando ausente, cada template usa o seu texto por omissão. */
  subtitle?: string | null;
  hostName: string;
  startsAt?: string | null;
  endsAt?: string | null;
  timezone?: string | null;
  city?: string | null;
  /** Endereço da localização principal (Bloco 16). */
  address?: string | null;
  venue?: string | null;
  onlineLink?: string | null;
  message?: string | null;
  dressCode?: string | null;
  rsvpDeadline?: string | null;
  coverUrl?: string | null;
  type?: string | null;
  templateSlug?: string | null;
  /** Bloco 16: lista de localizações para a linha "+N locais". */
  locations?: InvitationEventView['locations'];
  /** Nome do convidado, quando o link foi aberto por alguém identificado. */
  guestName?: string | null;
}

@Component({
  selector: 'app-template-renderer',
  imports: [GratitudeInvitationComponent, TemplatePreviewComponent],
  template: `
    @if (isGratitude()) {
      <div class="relative">
        <app-gratitude-invitation
          [event]="gratitudeEvent()"
          [manifest]="manifest()"
          [editorMode]="editable()"
          [coverOnly]="isCover()"
        />
        @if (editable()) {
          <button
            type="button"
            class="absolute inset-x-0 top-0 z-10 h-24 cursor-pointer rounded-t-[inherit] border-2 border-transparent hover:border-brand/50"
            [class.!border-brand]="selectedBlockId() === gratitudeTitleId()"
            data-testid="gratitude-title-select"
            (click)="blockSelect.emit(gratitudeTitleId())"
          >
            <span class="sr-only">{{ i18n.t('block15.editor.selectTitle') }}</span>
          </button>
        }
      </div>
    } @else if (usePreview()) {
      <app-template-preview
        [manifest]="manifest()"
        [variant]="previewVariant()"
        [animate]="animate()"
        [kicker]="kicker()"
        [title]="data().title"
        [subtitle]="subtitle()"
        [label]="label()"
        class="block h-full"
      />
    } @else {
      <div
        class="relative isolate flex min-h-full flex-col overflow-hidden rounded-[inherit]"
        [style]="style()"
        [style.background]="'var(--tpl-bg)'"
        [style.color]="'var(--tpl-ink)'"
      >
        <div class="relative flex flex-1 flex-col gap-4 p-6 sm:p-8" [class.items-center]="centered()" [class.text-center]="centered()">
          @if (mode() === 'full') {
            @if (data().guestName; as guestName) {
              <p
                class="text-sm font-semibold sm:text-base"
                data-testid="template-guest-name"
                [style.color]="'var(--tpl-accent)'"
              >
                {{ i18n.t('invitation.guestGreeting', { name: guestName }) }}
              </p>
            }
          }
          @for (block of blocks(); track block.id) {
            <div
              class="relative w-full rounded-xl transition"
              [class.cursor-pointer]="editable()"
              [class.ring-2]="selectedBlockId() === block.id"
              [class.ring-brand]="selectedBlockId() === block.id"
              [class.ring-offset-2]="selectedBlockId() === block.id"
              [attr.data-block-id]="block.id"
              [attr.data-block-type]="block.type"
              [attr.tabindex]="editable() ? 0 : null"
              (click)="editable() && blockSelect.emit(block.id)"
              (keydown.enter)="editable() && blockSelect.emit(block.id)"
            >
              @switch (block.type) {
                @case ('title') {
                  <h2 class="font-display min-w-0 text-3xl font-semibold tracking-tight sm:text-4xl [overflow-wrap:anywhere]" [style.font-family]="displayFont()" [style]="blockStyle(block)">
                    {{ blockText(block, data().title) }}
                  </h2>
                }
                @case ('text') {
                  <p class="max-w-2xl text-sm leading-6 sm:text-base" [style.font-family]="bodyFont()" [style]="blockStyle(block)">
                    {{ blockText(block, '') }}
                  </p>
                }
                @case ('message') {
                  @if (blockText(block, data().message ?? '') || editable()) {
                    <p class="max-w-2xl text-sm leading-6 sm:text-base" [style.font-family]="bodyFont()" [style]="blockStyle(block)">
                      {{ blockText(block, data().message ?? '') || i18n.t('block15.editor.messagePlaceholder') }}
                    </p>
                  }
                }
                @case ('datetime') {
                  @if (data().startsAt || editable()) {
                    <div class="text-sm font-medium" [style.color]="'var(--tpl-muted)'" [style]="blockStyle(block)">
                      {{ data().startsAt ? formatDate(data().startsAt!) : i18n.t('block15.editor.datetimePlaceholder') }}
                    </div>
                  }
                }
                @case ('location') {
                  @if (locationText() || editable()) {
                    <div class="text-sm font-medium" [style.color]="'var(--tpl-muted)'" [style]="blockStyle(block)">
                      {{ locationText() || i18n.t('block15.editor.locationPlaceholder') }}
                    </div>
                  }
                }
                @case ('dress_code') {
                  @if (blockText(block, data().dressCode ?? '') || editable()) {
                    <div class="rounded-2xl border px-4 py-3 text-sm" [style.border-color]="'var(--tpl-accent)'" [style]="blockStyle(block)">
                      <span class="font-semibold">{{ i18n.t('block15.gratitude.dressCode') }}: </span>{{ blockText(block, data().dressCode ?? '') || i18n.t('block15.editor.dressCodePlaceholder') }}
                    </div>
                  }
                }
                @case ('divider') {
                  <hr class="w-16 border-t-2" [style.border-color]="'var(--tpl-accent)'" [style]="blockStyle(block)" />
                }
                @case ('countdown') {
                  <div class="rounded-2xl border px-4 py-3 text-sm" [style.border-color]="'var(--tpl-accent)'" [style]="blockStyle(block)">
                    {{ i18n.t('block15.editor.countdown') }}
                  </div>
                }
                @case ('timeline') {
                  <div class="w-full max-w-2xl space-y-2" [style]="blockStyle(block)">
                    @for (item of timelineItems(block); track item.label + '-' + $index) {
                      <div class="flex gap-3 text-sm"><span class="font-semibold" [style.color]="'var(--tpl-accent)'">{{ item.time || '--:--' }}</span><span>{{ item.label }}</span></div>
                    }
                    @if (timelineItems(block).length === 0) {
                      <p class="text-sm" [style.color]="'var(--tpl-muted)'">{{ i18n.t('block15.editor.timelinePlaceholder') }}</p>
                    }
                  </div>
                }
                @case ('gifts') {
                  <div class="rounded-2xl border px-4 py-3 text-sm" [style.border-color]="'var(--tpl-accent)'" [style]="blockStyle(block)">
                    {{ blockText(block, i18n.t('block15.editor.giftsPlaceholder')) }}
                  </div>
                }
                @case ('image') {
                  @if (imageUrl(block); as url) {
                    <img [src]="url" [alt]="imageAlt(block)" class="max-h-80 w-full rounded-2xl object-cover" [style]="blockStyle(block)" />
                  } @else {
                    <div class="grid min-h-32 place-items-center rounded-2xl border border-dashed px-4 py-6 text-sm" [style.border-color]="'var(--tpl-accent)'" [style.color]="'var(--tpl-muted)'">
                      {{ i18n.t('block15.editor.imagePlaceholder') }}
                    </div>
                  }
                }
                @case ('gallery') {
                  <div class="grid w-full grid-cols-3 gap-2" [style]="blockStyle(block)">
                    @for (url of galleryUrls(block); track url + '-' + $index) {
                      <img [src]="url" alt="" class="aspect-square rounded-xl object-cover" />
                    }
                    @if (galleryUrls(block).length === 0) {
                      <div class="col-span-3 grid min-h-24 place-items-center rounded-2xl border border-dashed text-sm" [style.border-color]="'var(--tpl-accent)'" [style.color]="'var(--tpl-muted)'">{{ i18n.t('block15.editor.galleryPlaceholder') }}</div>
                    }
                  </div>
                }
                @case ('music_video') {
                  @if (youtubeEmbed(block); as src) {
                    <div class="aspect-video w-full overflow-hidden rounded-2xl"><iframe [src]="src" class="h-full w-full" title="Video" loading="lazy" allowfullscreen></iframe></div>
                  } @else {
                    <div class="grid min-h-24 place-items-center rounded-2xl border border-dashed text-sm" [style.border-color]="'var(--tpl-accent)'" [style.color]="'var(--tpl-muted)'">{{ i18n.t('block15.editor.videoPlaceholder') }}</div>
                  }
                }
                @case ('qr') {
                  <div class="rounded-2xl border px-4 py-3 text-sm" [style.border-color]="'var(--tpl-accent)'" [style]="blockStyle(block)">{{ qrLabel(block) }}</div>
                }
                @case ('buttons') {
                  <div class="flex flex-wrap gap-2" [style]="blockStyle(block)">
                    @for (btn of buttons(block); track btn.label + '-' + $index) {
                      <span class="rounded-full border px-4 py-2 text-xs font-semibold" [style.border-color]="'var(--tpl-accent)'">{{ btn.label }}</span>
                    }
                    @if (buttons(block).length === 0) {
                      <span class="text-sm" [style.color]="'var(--tpl-muted)'">{{ i18n.t('block15.editor.buttonsPlaceholder') }}</span>
                    }
                  </div>
                }
                @case ('ornament') {
                  <div class="text-2xl" [style.color]="'var(--tpl-accent)'" [style]="blockStyle(block)">✦</div>
                }
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class TemplateRendererComponent {
  protected readonly i18n = inject(I18nService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly manifest = input.required<TemplateManifest>();
  readonly data = input.required<TemplateRenderData>();
  readonly mode = input<'preview' | 'invite' | 'full' | 'cover'>('invite');
  readonly previewVariant = input<'thumb' | 'cover' | 'hero'>('hero');
  readonly animate = input(false);
  readonly kicker = input('');
  readonly label = input('');
  readonly editable = input(false);
  readonly selectedBlockId = input<string | null>(null);
  readonly blockSelect = output<string>();

  protected readonly isGratitude = computed(() => {
    const m = this.manifest();
    return m.ornaments.frame === 'gratitude' || this.data().templateSlug === 'gratitude';
  });

  protected readonly usePreview = computed(() => this.mode() === 'preview' && !this.isGratitude());
  protected readonly isCover = computed(() => this.mode() === 'cover');
  protected readonly centered = computed(() => this.manifest().layout.align === 'center');
  protected readonly style = computed(() => manifestStyle(this.manifest()));
  protected readonly displayFont = computed(() => fontFamily(this.manifest().fonts.display));
  protected readonly bodyFont = computed(() => fontFamily(this.manifest().fonts.body));

  protected readonly subtitle = computed(() => {
    const d = this.data();
    const parts = [this.formatDate(d.startsAt), [d.venue, d.city].filter(Boolean).join(', ')].filter(Boolean);
    return parts.join(' · ');
  });

  protected readonly blocks = computed<TemplateBlock[]>(() => {
    const doc = this.manifest().document;
    const blocks: TemplateBlock[] =
      doc?.version === 2 && Array.isArray(doc.blocks)
        ? doc.blocks.filter((b) => b.visible !== false || this.editable())
        : this.manifest().layout.blocks.map((b, i) => this.v1Block(b, i));
    if (!this.isCover()) return blocks;
    return blocks.filter((block) => this.showsInCover(block));
  });

  /** Bloco 16: por omissão, a capa mostra só identidade e título. */
  private showsInCover(block: TemplateBlock): boolean {
    if (typeof block.showInCover === 'boolean') return block.showInCover;
    if (block.type === 'ornament' || block.type === 'title') return true;
    return /org|subtitle|highlight|host/i.test(block.id);
  }

  protected readonly gratitudeTitleId = computed(() => {
    const b = this.blocks().find((x) => x.type === 'title');
    return b?.id ?? 'gratitude-title';
  });

  protected readonly gratitudeEvent = computed<InvitationEventView>(() => {
    const d = this.data();
    return {
      id: '',
      title: d.title,
      subtitle: d.subtitle ?? null,
      type: (d.type as InvitationEventView['type']) ?? 'other',
      hostName: d.hostName,
      hostEmail: '',
      hostPhone: null,
      hostAvatarUrl: null,
      startsAt: d.startsAt ?? new Date().toISOString(),
      endsAt: d.endsAt ?? null,
      rsvpDeadline: d.rsvpDeadline ?? null,
      timezone: d.timezone ?? 'Africa/Luanda',
      venue: d.venue ?? '',
      address: d.address ?? '',
      city: d.city ?? '',
      onlineLink: d.onlineLink ?? null,
      message: d.message ?? '',
      rules: '',
      dressCode: d.dressCode ?? '',
      coverUrl: d.coverUrl ?? null,
      templateId: null,
      status: 'published',
      contributionEnabled: false,
      bankDetails: null,
      manifest: this.manifest(),
      templateSlug: d.templateSlug ?? 'gratitude',
      youtubeVideoId: null,
      latitude: null,
      longitude: null,
      placeLabel: null,
      placeName: null,
      locations: d.locations ?? [],
      guestName: d.guestName ?? null,
      organizers: [],
      community: null,
    };
  });

  protected blockText(block: TemplateBlock, fallback: string): string {
    const text = 'text' in block ? (block as { text?: string }).text : undefined;
    return typeof text === 'string' && text.trim() ? text : fallback;
  }

  protected blockStyle(block: TemplateBlock): Record<string, string> {
    const s = block.style;
    if (!s) return {};
    const out: Record<string, string> = {};
    if (s.fontFamily) out['font-family'] = fontFamily(s.fontFamily);
    if (s.fontWeight) out['font-weight'] = s.fontWeight;
    if (s.fontStyle) out['font-style'] = s.fontStyle;
    if (s.fontSize) out['font-size'] = `${s.fontSize}px`;
    if (s.color) out['color'] = s.color;
    if (s.letterSpacing != null) out['letter-spacing'] = `${s.letterSpacing}px`;
    if (s.align) out['text-align'] = s.align;
    return out;
  }

  protected locationText(): string {
    const d = this.data();
    return [d.venue, d.city].filter(Boolean).join(', ') || d.onlineLink || '';
  }

  protected formatDate(iso?: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' });
  }

  protected timelineItems(block: TemplateBlock): Array<{ time?: string; label: string }> {
    const items: unknown = block.type === 'timeline' ? block.items : null;
    return Array.isArray(items) ? (items as TimelineItem[]) : [];
  }
  protected imageUrl(block: TemplateBlock): string | null {
    const url: unknown = block.type === 'image' ? block.url : null;
    return typeof url === 'string' ? url : null;
  }
  protected imageAlt(block: TemplateBlock): string {
    const alt: unknown = block.type === 'image' ? block.alt : null;
    return typeof alt === 'string' ? alt : '';
  }
  protected galleryUrls(block: TemplateBlock): string[] {
    const urls: unknown = block.type === 'gallery' ? block.urls : null;
    return Array.isArray(urls) ? urls.filter((u): u is string => typeof u === 'string') : [];
  }
  protected youtubeEmbed(block: TemplateBlock): SafeResourceUrl | null {
    const id: unknown = block.type === 'music_video' ? block.youtubeId : null;
    return typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id)
      ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${id}`)
      : null;
  }
  protected qrLabel(block: TemplateBlock): string {
    const label: unknown = block.type === 'qr' ? block.label : null;
    return typeof label === 'string' && label.trim() ? label : this.i18n.t('block15.editor.qrPlaceholder');
  }
  protected buttons(block: TemplateBlock): Array<{ label: string }> {
    const buttons: unknown = block.type === 'buttons' ? block.buttons : null;
    return Array.isArray(buttons) ? (buttons as ActionButton[]) : [];
  }

  private v1Block(block: string, i: number): TemplateBlock {
    const id = `v1-${block}-${i}`;
    switch (block) {
      case 'title': return { id, type: 'title', text: '' };
      case 'message': return { id, type: 'message', text: '' };
      case 'datetime': return { id, type: 'datetime' };
      case 'location': return { id, type: 'location' };
      case 'deadline': return { id, type: 'text', text: this.i18n.t('block15.editor.deadline') };
      case 'host': return { id, type: 'text', text: this.data().hostName };
      default: return { id, type: 'text', text: '' };
    }
  }
}
