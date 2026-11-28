import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, input, output, signal, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { GuestKindValue, guestPlural } from '../../../core/i18n/block15-keys';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { ShareService } from '../../../core/services/share.service';
import { ToastService } from '../../../core/services/toast.service';
import { ICONS } from '../../../core/ui/icons';
import { ModalComponent } from '../../../shared/components/modal.component';
import { InvitationEventView, InvitationLocation } from '../invitation.models';

interface InfoSection {
  id: string;
  key: 'locations' | 'video' | 'organizers' | 'message' | 'rules' | 'gifts' | 'share' | 'privacy';
}

/**
 * Bloco 16 — folha de leitura aberta pelo botão flutuante. Reúne tudo o que
 * não cabe num bloco visível do template, por ordem fixa, com atalhos no topo.
 */
@Component({
  selector: 'app-invitation-info-sheet',
  imports: [FaIconComponent, ModalComponent],
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      app-invitation-info-sheet .inv-sheet-nav { gap: 0.5rem; }
      app-invitation-info-sheet .inv-sheet-chip { min-height: 38px; }
      app-invitation-info-sheet .inv-sheet-heading {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
      }
      app-invitation-info-sheet .inv-sheet-icon {
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.9rem;
        background: color-mix(in srgb, var(--inv-accent) 12%, var(--inv-bg));
        color: var(--inv-accent);
        font-size: 0.95rem;
      }
      app-invitation-info-sheet .inv-sheet-title {
        font-family: var(--font-display);
        font-size: 1.05rem;
        font-weight: 600;
        line-height: 1.3;
        color: var(--inv-ink);
      }
      app-invitation-info-sheet .inv-sheet-hint {
        margin-top: 0.15rem;
        font-size: 0.75rem;
        line-height: 1.5;
        color: var(--inv-muted);
      }
      app-invitation-info-sheet .inv-sheet-card {
        border: 1px solid var(--inv-line);
        border-radius: 1.25rem;
        padding: 1rem;
        background: var(--inv-surface-raised);
      }
      app-invitation-info-sheet .inv-sheet-card[data-primary='true'] {
        border-left: 3px solid var(--inv-accent);
        padding-left: calc(1rem - 2px);
      }
      app-invitation-info-sheet .inv-video-frame {
        position: relative;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        border: 1px solid var(--inv-line);
        border-radius: 1rem;
        background: color-mix(in srgb, var(--inv-ink) 80%, #000000);
        box-shadow: var(--shadow-card);
      }
      app-invitation-info-sheet .inv-video-cover {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
      }
      app-invitation-info-sheet .inv-video-cover:focus-visible {
        outline: 2px solid var(--inv-accent);
        outline-offset: -4px;
      }
      app-invitation-info-sheet .inv-video-thumb {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0.88;
      }
      app-invitation-info-sheet .inv-video-shade {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgb(0 0 0 / 0.05), rgb(0 0 0 / 0.38));
      }
      app-invitation-info-sheet .inv-play-badge {
        position: absolute;
        top: 50%;
        left: 50%;
        display: grid;
        place-items: center;
        width: clamp(3.25rem, 16%, 4.5rem);
        aspect-ratio: 1;
        transform: translate(-50%, -50%);
        border-radius: 0.85rem;
        background: #ff0000;
        color: #ffffff;
        font-size: clamp(1rem, 4cqw, 1.5rem);
        box-shadow: var(--shadow-pop);
        transition: transform 150ms ease, background 150ms ease;
      }
      app-invitation-info-sheet .inv-video-cover:hover .inv-play-badge {
        transform: translate(-50%, -50%) scale(1.06);
        background: #cc0000;
      }
      app-invitation-info-sheet .inv-video-label {
        position: absolute;
        bottom: 0.65rem;
        left: 0.75rem;
        border-radius: 999px;
        padding: 0.35rem 0.7rem;
        background: rgb(0 0 0 / 0.65);
        color: #ffffff;
        font-size: 0.7rem;
        font-weight: 600;
      }
      app-invitation-info-sheet .inv-video-embed {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
      }
    `,
  ],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('block16.sheet.title')"
      presentation="sheet"
      size="lg"
      [invitation]="true"
      (closed)="closed.emit()"
    >
      <div class="inv-sheet-nav inv-no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1" role="group" [attr.aria-label]="i18n.t('block16.sheet.title')">
        @for (section of sections(); track section.id) {
          <button type="button" class="inv-chip inv-sheet-chip" [attr.data-testid]="'inv-sheet-chip-' + section.id" (click)="jump(section.id)">
            {{ i18n.t(sectionKey(section)) }}
          </button>
        }
      </div>

      <div class="flex flex-col gap-5">
        @if (locations().length) {
          <section [id]="'inv-section-locations'" data-testid="inv-section-locations">
            <header class="inv-sheet-heading">
              <span class="inv-sheet-icon" aria-hidden="true"><fa-icon [icon]="icons['location']" /></span>
              <div class="min-w-0">
                <h3 class="inv-sheet-title">{{ i18n.t('block16.sheet.locations') }}</h3>
                <p class="inv-sheet-hint">{{ i18n.t('block16.sheet.locationsHint') }}</p>
              </div>
            </header>
            <div class="mt-4 flex flex-col gap-3">
              @for (location of locations(); track location.id ?? location.address ?? $index) {
                <article class="inv-sheet-card" [attr.data-primary]="location.isPrimary">
                  <div class="mb-2 flex flex-wrap items-center gap-2">
                    @if (location.isPrimary) {
                      <span class="inv-chip inv-accent-bg" data-testid="inv-primary-badge">{{ i18n.t('block16.locations.primary') }}</span>
                    }
                    @if (location.label) {
                      <span class="inv-chip">{{ location.label }}</span>
                    }
                    @if (location.startsAt) {
                      <span class="inv-chip">{{ shortTime(location.startsAt) }}</span>
                    }
                  </div>
                  <p class="text-sm font-semibold inv-ink">{{ location.address || location.venueName || i18n.t('block16.locations.empty') }}</p>
                  @if (location.venueName || location.city) {
                    <p class="mt-1 text-xs inv-muted">@if (location.venueName) { {{ location.venueName }}@if (location.city) { · } }@if (location.city) { {{ location.city }} }</p>
                  }
                  <div class="mt-4 flex flex-wrap gap-2">
                    @if (location.kind === 'online') {
                      @if (location.onlineUrl) {
                        <a class="inv-btn-secondary" [href]="location.onlineUrl" target="_blank" rel="noopener noreferrer" data-testid="inv-location-link">{{ i18n.t('block16.locations.openLink') }}</a>
                      }
                    } @else if (location.mapsUrl) {
                      <a class="inv-btn-secondary" [href]="location.mapsUrl" target="_blank" rel="noopener noreferrer" data-testid="inv-location-maps">{{ i18n.t('block16.locations.openMaps') }}</a>
                    }
                    @if (location.address) {
                      <button type="button" class="inv-btn-secondary" (click)="copyAddress(location)" data-testid="inv-location-copy">{{ i18n.t('block16.locations.copyAddress') }}</button>
                    }
                  </div>
                </article>
              }
            </div>
          </section>
        }

        @if (videoId()) {
          <section [id]="'inv-section-video'" data-testid="inv-section-video">
            <header class="inv-sheet-heading">
              <span class="inv-sheet-icon" aria-hidden="true"><fa-icon [icon]="icons['play']" /></span>
              <div class="min-w-0">
                <h3 class="inv-sheet-title">{{ i18n.t('block16.sheet.video') }}</h3>
                <p class="inv-sheet-hint">{{ i18n.t('block16.sheet.videoHint') }}</p>
              </div>
            </header>
            <div class="inv-video-frame mt-4">
              @if (videoOpen()) {
                <iframe
                  class="inv-video-embed"
                  [src]="embedUrl()"
                  [title]="i18n.t('block16.sheet.play')"
                  loading="lazy"
                  referrerpolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowfullscreen
                ></iframe>
              } @else {
                <button
                  type="button"
                  class="inv-video-cover"
                  (click)="videoOpen.set(true)"
                  data-testid="inv-video-play"
                  [attr.aria-label]="i18n.t('block16.sheet.play')"
                >
                  <img
                    class="inv-video-thumb"
                    [src]="thumbnailUrl()"
                    alt=""
                    loading="lazy"
                    referrerpolicy="strict-origin-when-cross-origin"
                  />
                  <span class="inv-video-shade" aria-hidden="true"></span>
                  <span class="inv-play-badge" aria-hidden="true"><fa-icon [icon]="icons['play']" /></span>
                  <span class="inv-video-label">{{ i18n.t('block16.sheet.play') }}</span>
                </button>
              }
            </div>
          </section>
        }

        @if (organizers().length || event().community) {
          <section [id]="'inv-section-organizers'" data-testid="inv-section-organizers">
            <header class="inv-sheet-heading">
              <span class="inv-sheet-icon" aria-hidden="true"><fa-icon [icon]="icons['user']" /></span>
              <div class="min-w-0">
                <h3 class="inv-sheet-title">{{ i18n.t('block16.sheet.organizers') }}</h3>
                <p class="inv-sheet-hint">{{ i18n.t('block16.sheet.organizersHint') }}</p>
              </div>
            </header>
            <div class="mt-4 flex flex-col gap-3">
              @if (event().community; as community) {
                <p class="inv-sheet-card text-sm font-semibold inv-ink">{{ community.name }}</p>
              }
              @for (organizer of organizers(); track organizer.email ?? organizer.name) {
                <div class="inv-sheet-card flex flex-wrap items-center justify-between gap-3">
                  <p class="text-sm font-semibold inv-ink">{{ organizer.name }}</p>
                  <div class="flex flex-wrap gap-2">
                    @if (organizer.email) {
                      <a class="inv-btn-secondary" [href]="'mailto:' + organizer.email"><fa-icon [icon]="icons['envelope']" aria-hidden="true" /> {{ i18n.t('block14.organizers.email') }}</a>
                    }
                    @if (organizer.phone) {
                      <a class="inv-btn-secondary" [href]="'https://wa.me/' + organizer.phone.replace(/\\D/g, '')" target="_blank" rel="noopener noreferrer"><fa-icon [icon]="icons['whatsapp']" aria-hidden="true" /> {{ i18n.t('block14.organizers.whatsapp') }}</a>
                    }
                  </div>
                </div>
              }
              <div class="flex flex-wrap gap-2 pt-1">
                <button type="button" class="inv-btn-secondary" (click)="openHost.emit()">{{ i18n.t('invitation.hostTitle') }}</button>
                <button type="button" class="inv-btn-secondary" (click)="openLocations.emit()">{{ i18n.t('block16.sheet.locations') }}</button>
              </div>
            </div>
          </section>
        }

        @if (event().message) {
          <section [id]="'inv-section-message'" data-testid="inv-section-message">
            <header class="inv-sheet-heading">
              <span class="inv-sheet-icon" aria-hidden="true"><fa-icon [icon]="icons['envelope']" /></span>
              <div class="min-w-0">
                <h3 class="inv-sheet-title">{{ i18n.t('block16.sheet.message') }}</h3>
                <p class="inv-sheet-hint">{{ i18n.t('block16.sheet.messageHint') }}</p>
              </div>
            </header>
            <blockquote class="mt-4 rounded-3xl border inv-line inv-surface-raised p-4 sm:p-5">
              <p class="whitespace-pre-line text-sm leading-7 inv-ink">{{ event().message }}</p>
              <p class="mt-4 text-xs inv-muted">— {{ event().hostName }}</p>
            </blockquote>
          </section>
        }

        @if (event().rules || event().dressCode) {
          <section [id]="'inv-section-rules'" data-testid="inv-section-rules">
            <header class="inv-sheet-heading">
              <span class="inv-sheet-icon" aria-hidden="true"><fa-icon [icon]="icons['shield']" /></span>
              <h3 class="inv-sheet-title">{{ i18n.t('block16.sheet.rules') }}</h3>
            </header>
            <div class="inv-sheet-card mt-4">
              @if (event().rules) {
                <p class="whitespace-pre-line text-sm leading-6 inv-ink">{{ event().rules }}</p>
              }
              @if (event().dressCode) {
                <p class="mt-2 text-sm inv-ink"><strong>{{ i18n.t('invitation.dressTitle') }}:</strong> {{ event().dressCode }}</p>
              }
            </div>
          </section>
        }

        @if (event().contributionEnabled && event().bankDetails; as bank) {
          <section [id]="'inv-section-gifts'" data-testid="inv-section-gifts">
            <header class="inv-sheet-heading">
              <span class="inv-sheet-icon" aria-hidden="true"><fa-icon [icon]="icons['heart']" /></span>
              <h3 class="inv-sheet-title">{{ i18n.t('block16.sheet.gifts') }}</h3>
            </header>
            <div class="inv-sheet-card mt-4">
              <p class="text-sm inv-ink">{{ bank.bankName }} · {{ bank.accountHolder }}</p>
              <p class="mt-1 break-all font-mono text-xs inv-muted">{{ bank.accountReference }}</p>
            </div>
          </section>
        }

        <section [id]="'inv-section-share'" data-testid="inv-section-share">
          <header class="inv-sheet-heading">
            <span class="inv-sheet-icon" aria-hidden="true"><fa-icon [icon]="icons['share']" /></span>
            <div class="min-w-0">
              <h3 class="inv-sheet-title">{{ i18n.t('block16.sheet.share') }}</h3>
              <p class="inv-sheet-hint">{{ i18n.t('block16.sheet.shareHint') }}</p>
            </div>
          </header>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" class="inv-btn-secondary" (click)="copyLink()" data-testid="inv-copy-link"><fa-icon [icon]="icons['copy']" aria-hidden="true" /> {{ i18n.t('invitation.copyLink') }}</button>
            <button type="button" class="inv-btn-secondary" (click)="shareWhatsapp()" data-testid="inv-whatsapp"><fa-icon [icon]="icons['whatsapp']" aria-hidden="true" /> {{ i18n.t('invitation.whatsapp') }}</button>
          </div>
        </section>

        <section [id]="'inv-section-privacy'" data-testid="inv-section-privacy">
          <header class="inv-sheet-heading">
            <span class="inv-sheet-icon" aria-hidden="true"><fa-icon [icon]="icons['lock']" /></span>
            <h3 class="inv-sheet-title">{{ i18n.t('block16.sheet.privacy') }}</h3>
          </header>
          <p class="mt-3 text-xs leading-5 inv-muted">{{ i18n.t('invitation.reminderText') }} {{ i18n.t('invitation.privacyText') }}</p>
        </section>
      </div>
    </app-modal>
  `,
})
export class InvitationInfoSheetComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly share = inject(ShareService);
  private readonly toasts = inject(ToastService);

  readonly open = input(false);
  readonly event = input.required<InvitationEventView>();
  readonly token = input('');
  readonly sharePath = input('');
  readonly guestKind = input<GuestKindValue>(null);

  readonly closed = output<void>();
  readonly openHost = output<void>();
  readonly openLocations = output<void>();

  protected readonly videoOpen = signal(false);
  protected readonly locations = computed<InvitationLocation[]>(() => this.event().locations);
  protected readonly organizers = computed(() => this.event().organizers);
  protected readonly videoId = computed(() => this.event().youtubeVideoId);

  protected readonly sections = computed<InfoSection[]>(() => {
    const e = this.event();
    const list: InfoSection[] = [];
    if (e.locations.length) list.push({ id: 'locations', key: 'locations' });
    if (e.youtubeVideoId) list.push({ id: 'video', key: 'video' });
    if (e.organizers.length || e.community) list.push({ id: 'organizers', key: 'organizers' });
    if (e.message) list.push({ id: 'message', key: 'message' });
    if (e.rules || e.dressCode) list.push({ id: 'rules', key: 'rules' });
    if (e.contributionEnabled) list.push({ id: 'gifts', key: 'gifts' });
    list.push({ id: 'share', key: 'share' }, { id: 'privacy', key: 'privacy' });
    return list;
  });

  /** A miniatura vem do CDN do YouTube; o iframe (nocookie) só é pedido após o clique. */
  protected readonly thumbnailUrl = computed(
    () => `https://i.ytimg.com/vi/${this.videoId()}/hqdefault.jpg`,
  );

  protected readonly embedUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${this.videoId()}?autoplay=1&rel=0`,
    ),
  );

  protected sectionKey(section: InfoSection): TranslationKey {
    return `block16.sheet.${section.key}` as TranslationKey;
  }

  protected jump(id: string): void {
    this.document.getElementById(`inv-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected shortTime(value: string): string {
    return new Intl.DateTimeFormat(this.i18n.locale() === 'pt-AO' ? 'pt-AO' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected async copyLink(): Promise<void> {
    const copied = await this.share.copy(this.share.absoluteUrl(this.sharePath() || `/convite/${this.token()}`));
    this.toasts.show(copied ? this.i18n.t('common.copied') : this.i18n.t('common.copyFailed'), copied ? 'success' : 'error');
  }

  protected shareWhatsapp(): void {
    const url = this.share.absoluteUrl(`/convite/${this.token()}`);
    const key = guestPlural(this.guestKind()) ? 'block15.invitation.shareMessagePlural' : 'invitation.shareMessage';
    this.share.openExternal(this.share.whatsappShareUrl(this.i18n.t(key, { url })));
  }

  protected async copyAddress(location: InvitationLocation): Promise<void> {
    const address = [location.address, location.city].filter(Boolean).join(', ');
    const copied = await this.share.copy(address);
    this.toasts.show(copied ? this.i18n.t('common.copied') : this.i18n.t('common.copyFailed'), copied ? 'success' : 'error');
  }
}
