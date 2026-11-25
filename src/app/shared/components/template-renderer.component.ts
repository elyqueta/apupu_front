import { Component, computed, inject, input } from '@angular/core';
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
      <app-gratitude-invitation [event]="gratitudeEvent()" [manifest]="manifest()" />
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
                @if (blockText(block, data().message ?? '')) {
                  <p class="max-w-2xl text-sm leading-6 sm:text-base" [style.font-family]="bodyFont()" [style]="blockStyle(block)">
                    {{ blockText(block, data().message ?? '') }}
                  </p>
                }
              }
              @case ('datetime') {
                @if (data().startsAt) {
                  <div class="text-sm font-medium" [style.color]="'var(--tpl-muted)'" [style]="blockStyle(block)">
                    {{ formatDate(data().startsAt!) }}
                  </div>
                }
              }
              @case ('location') {
                @if (locationText()) {
                  <div class="text-sm font-medium" [style.color]="'var(--tpl-muted)'" [style]="blockStyle(block)">
                    {{ locationText() }}
                  </div>
                }
              }
              @case ('dress_code') {
                @if (blockText(block, data().dressCode ?? '')) {
                  <div class="rounded-2xl border px-4 py-3 text-sm" [style.border-color]="'var(--tpl-accent)'" [style]="blockStyle(block)">
                    <span class="font-semibold">{{ i18n.t('block15.gratitude.dressCode') }}: </span>{{ blockText(block, data().dressCode ?? '') }}
                  </div>
                }
              }
              @case ('divider') {
                <hr class="w-16 border-t-2" [style.border-color]="'var(--tpl-accent)'" [style]="blockStyle(block)" />
              }
            }
          }
        </div>
      </div>
    }
  `,
})
export class TemplateRendererComponent {
  protected readonly i18n = inject(I18nService);

  readonly manifest = input.required<TemplateManifest>();
  readonly data = input.required<TemplateRenderData>();
  readonly mode = input<'preview' | 'invite'>('invite');
  readonly previewVariant = input<'thumb' | 'cover' | 'hero'>('hero');
  readonly animate = input(false);
  readonly kicker = input('');
  readonly label = input('');

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
    if (doc?.version === 2 && Array.isArray(doc.blocks)) return doc.blocks.filter((b) => b.visible !== false);
    // fallback from v1 layout
    return this.manifest().layout.blocks.map((b, i) => this.v1Block(b, i));
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
    const text = 'text' in block ? block.text : undefined;
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

  private v1Block(block: string, i: number): TemplateBlock {
    const id = `v1-${block}-${i}`;
    switch (block) {
      case 'title':
        return { id, type: 'title', text: '' };
      case 'message':
        return { id, type: 'message', text: '' };
      case 'datetime':
        return { id, type: 'datetime' };
      case 'location':
        return { id, type: 'location' };
      case 'deadline':
        return { id, type: 'text', text: '' };
      case 'host':
        return { id, type: 'text', text: '' };
      default:
        return { id, type: 'text', text: '' };
    }
  }
}
