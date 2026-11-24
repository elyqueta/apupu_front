import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';
import { DEFAULT_MANIFEST, TemplateManifest } from '../../../core/models/template-manifest';
import { TemplatePreviewComponent } from '../../../shared/components/template-preview.component';

/**
 * Primeira tela do convite. Com capa: a imagem sem texto por cima (Bloco
 * 5). Sem capa (Bloco 14): abre no estilo do template. A animação segue o
 * `open_style` do manifesto (≤ 1,5 s, `prefers-reduced-motion` respeitado)
 * e o botão "Ver convite" está sempre disponível.
 */
@Component({
  selector: 'app-invitation-welcome',
  imports: [FaIconComponent, TemplatePreviewComponent],
  template: `
    <main class="flex flex-1 flex-col justify-center py-6 sm:py-10">
      <article
        class="mx-auto w-full max-w-xl overflow-hidden rounded-4xl border border-line bg-surface shadow-card"
        [class]="'tpl-open-' + manifest().open_style"
        data-testid="invitation-welcome"
        [attr.data-open-style]="manifest().open_style"
      >
        @if (coverUrl(); as cover) {
          <img
            data-testid="invitation-welcome-cover"
            [src]="cover"
            [alt]="eventTitle()"
            class="block h-64 w-full object-cover sm:h-80"
          />
        } @else {
          <app-template-preview
            [manifest]="manifest()"
            variant="hero"
            [kicker]="i18n.t('block14.preview.kicker')"
            [title]="eventTitle()"
            class="h-64 sm:h-80"
          />
        }

        <div class="flex flex-col items-center gap-5 px-5 py-7 text-center sm:px-8 sm:py-9">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-strong">
            {{ i18n.t('invitation.eyebrow') }}
          </p>
          <h1 class="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {{ i18n.t('invitation.welcomeTitle') }}
          </h1>
          <p class="max-w-sm text-sm leading-6 text-muted">
            {{ i18n.t('invitation.welcomeMessage', { name: guestName() }) }}
          </p>
          <button
            type="button"
            data-testid="invitation-welcome-continue"
            class="ui-btn mt-1 w-full sm:w-auto sm:min-w-56"
            (click)="continue.emit()"
          >
            <fa-icon [icon]="icons['arrowRight']" aria-hidden="true" />
            {{ i18n.t('block14.welcome.open') }}
          </button>
        </div>
      </article>
    </main>
  `,
})
export class InvitationWelcomeComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly coverUrl = input<string | null>(null);
  readonly manifest = input<TemplateManifest>(DEFAULT_MANIFEST);
  readonly guestName = input('');
  readonly eventTitle = input('');

  readonly continue = output<void>();
}
