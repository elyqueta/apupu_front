import { Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';
import { ModalComponent } from '../../../shared/components/modal.component';

/**
 * Bloco 14/15 — vídeo de convite (YouTube). Abre em modal (como os detalhes),
 * com opção de ecrã inteiro sem sair para o YouTube.
 */
@Component({
  selector: 'app-invitation-video',
  imports: [FaIconComponent, ModalComponent],
  template: `
    @if (safeId(); as id) {
      <section class="overflow-hidden rounded-4xl border inv-line inv-surface inv-shadow" data-testid="invitation-video">
        <h2 class="px-5 pt-4 text-sm font-semibold inv-ink">{{ i18n.t('block14.video.title') }}</h2>
        <div class="p-3 sm:p-4">
          <div class="relative aspect-video overflow-hidden rounded-3xl bg-ink/90">
            <button
              type="button"
              class="group absolute inset-0 grid place-items-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/60"
              data-testid="invitation-video-play"
              [attr.aria-label]="i18n.t('block14.video.play')"
              (click)="open.set(true)"
            >
              <img [src]="'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'" alt="" class="absolute inset-0 size-full object-cover opacity-90" loading="lazy" />
              <span class="relative grid size-16 place-items-center rounded-full bg-white/90 text-2xl inv-ink transition group-hover:scale-105">
                <fa-icon [icon]="icons['play']" aria-hidden="true" />
              </span>
            </button>
          </div>
        </div>
      </section>

      <app-modal [open]="open()" [title]="i18n.t('block14.video.title')" size="lg" (closed)="close()" [invitation]="true">
        <div #videoShell class="overflow-hidden rounded-2xl bg-black">
          <div class="relative aspect-video w-full">
            @if (open()) {
              <iframe
                class="absolute inset-0 size-full"
                [src]="embedUrl()"
                [title]="i18n.t('block14.video.title') + ': ' + eventTitle()"
                loading="lazy"
                referrerpolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowfullscreen
              ></iframe>
            }
          </div>
        </div>
        <div modal-footer class="flex flex-wrap justify-end gap-2">
          <button type="button" class="inv-btn-secondary" data-testid="invitation-video-fullscreen" (click)="toggleFullscreen()">
            <fa-icon [icon]="icons['expand']" aria-hidden="true" />
            {{ i18n.t('block15.video.fullscreen') }}
          </button>
          <button type="button" class="inv-btn" (click)="close()">{{ i18n.t('common.close') }}</button>
        </div>
      </app-modal>
    }
  `,
})
export class InvitationVideoComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly sanitizer = inject(DomSanitizer);
  private readonly videoShell = viewChild<ElementRef<HTMLElement>>('videoShell');

  readonly videoId = input<string | null>(null);
  readonly eventTitle = input('');

  protected readonly open = signal(false);
  protected readonly safeId = computed(() => {
    const id = this.videoId();
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  });
  protected readonly embedUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${this.safeId()}?autoplay=1&rel=0`,
    ),
  );

  protected close(): void {
    this.open.set(false);
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      void document.exitFullscreen();
    }
  }

  protected async toggleFullscreen(): Promise<void> {
    if (typeof document === 'undefined') return;
    const el = this.videoShell()?.nativeElement;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await el.requestFullscreen?.();
  }
}
