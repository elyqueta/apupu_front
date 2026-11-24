import { Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';

/**
 * Bloco 14 — vídeo de convite (YouTube). Mostra só a miniatura com o botão
 * play; o iframe (`youtube-nocookie.com`) só é carregado ao clicar.
 * O ID já vem validado do back (11 caracteres) e é verificado de novo.
 */
@Component({
  selector: 'app-invitation-video',
  imports: [FaIconComponent],
  template: `
    @if (safeId(); as id) {
      <section class="overflow-hidden rounded-4xl border border-line bg-surface shadow-card" data-testid="invitation-video">
        <h2 class="px-5 pt-4 text-sm font-semibold text-ink">{{ i18n.t('block14.video.title') }}</h2>
        <div class="p-3 sm:p-4">
          <div class="relative aspect-video overflow-hidden rounded-3xl bg-ink/90">
            @if (playing()) {
              <iframe
                class="absolute inset-0 size-full"
                [src]="embedUrl()"
                [title]="i18n.t('block14.video.title') + ': ' + eventTitle()"
                loading="lazy"
                referrerpolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            } @else {
              <button
                type="button"
                class="group absolute inset-0 grid place-items-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/60"
                data-testid="invitation-video-play"
                [attr.aria-label]="i18n.t('block14.video.play')"
                (click)="playing.set(true)"
              >
                <img [src]="'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'" alt="" class="absolute inset-0 size-full object-cover opacity-90" loading="lazy" />
                <span class="relative grid size-16 place-items-center rounded-full bg-white/90 text-2xl text-ink shadow-card transition group-hover:scale-105">
                  <fa-icon [icon]="icons['play']" aria-hidden="true" />
                </span>
              </button>
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class InvitationVideoComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly sanitizer = inject(DomSanitizer);

  readonly videoId = input<string | null>(null);
  readonly eventTitle = input('');

  protected readonly playing = signal(false);
  protected readonly safeId = computed(() => {
    const id = this.videoId();
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  });
  protected readonly embedUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${this.safeId()}?autoplay=1&rel=0`,
    ),
  );
}
