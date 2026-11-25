import { Component, computed, inject, input, output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { I18nService } from '../../core/i18n/i18n.service';
import { TemplateManifest, fontFamily, manifestStyle } from '../../core/models/template-manifest';
import { TemplateBlock } from '../../core/models/template-document';
import { GratitudeInvitationComponent } from '../../features/invitation/parts/gratitude-invitation.component';
import { InvitationEventView } from '../../features/invitation/invitation.models';
import { TemplatePreviewComponent } from './template-preview.component';

export interface TemplateRenderData {
  title: string;
  hostName: string;
  startsAt?: string | null;
  endsAt?: string | null;
  timezone?: string | null;
  city?: string | null;
  venue?: string | null;
  onlineLink?: string | null;
  message?: string | null;
  dressCode?: string | null;
  rsvpDeadline?: string | null;
  coverUrl?: string | null;
  type?: string | null;
  templateSlug?: string | null;
}

@Component({
  selector: 'app-template-renderer',
  imports: [GratitudeInvitationComponent, TemplatePreviewComponent],
  template: `
    @if (isGratitude()) {
      <div class="relative">
        <app-gratitude-invitation [event]="gratitudeEvent()" [manifest]="manifest()" />
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
          @for (block of blocks(); track block.id) {
            <div
              class="relative w-full rounded-xl transition"
              [class.cursor-pointer]="editable()"
              [class.ring-2]="selectedBlockId() === block.id"
              [class.ring-brand]="selectedBlockId() === block.id"
              [class.ring-offset-2]="selectedBlockId() === block.id"
              [attr.data-block-id]="block.id"
              [attr.data-block-type]="block.type"
              (click)="editable() && blockSelect.emit(block.id)"
            >
              @switch (block.type) {
                @case ('title') {
                  <h2 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl" [style.font-family]="displayFont()" [style]="blockStyle(block)">
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
  readonly mode = input<'preview' | 'invite'>('invite');
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
    if (doc?.version === 2 && Array.isArray(doc.blocks)) return doc.blocks.filter((b) => b.visible !== false || this.editable());
    return this.manifest().layout.blocks.map((b, i) => this.v1Block(b, i));
  });

  protected readonly gratitudeTitleId = computed(() => {
    const b = this.blocks().find((x) => x.type === 'title');
    return b?.id ?? 'gratitude-title';
  });

  protected readonly gratitudeEvent = computed<InvitationEventView>(() => {
    const d = this.data();
    return {
      id: '',
      title: d.title,
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
      address: '',
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
    return block.type === 'timeline' && Array.isArray((block as any).items) ? (block as any).items : [];
  }
  protected imageUrl(block: TemplateBlock): string | null {
    return block.type === 'image' && typeof (block as any).url === 'string' ? (block as any).url : null;
  }
  protected imageAlt(block: TemplateBlock): string {
    return block.type === 'image' && typeof (block as any).alt === 'string' ? (block as any).alt : '';
  }
  protected galleryUrls(block: TemplateBlock): string[] {
    return block.type === 'gallery' && Array.isArray((block as any).urls) ? (block as any).urls.filter((u: unknown) => typeof u === 'string') : [];
  }
  protected youtubeEmbed(block: TemplateBlock): SafeResourceUrl | null {
    const id = block.type === 'music_video' ? (block as any).youtubeId : null;
    return typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id)
      ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${id}`)
      : null;
  }
  protected qrLabel(block: TemplateBlock): string {
    const label = block.type === 'qr' ? (block as any).label : null;
    return typeof label === 'string' && label.trim() ? label : this.i18n.t('block15.editor.qrPlaceholder');
  }
  protected buttons(block: TemplateBlock): Array<{ label: string }> {
    return block.type === 'buttons' && Array.isArray((block as any).buttons) ? (block as any).buttons : [];
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
