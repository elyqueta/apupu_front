import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { guestPlural, GuestKindValue } from '../../../core/i18n/block15-keys';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_MANIFEST, TemplateManifest } from '../../../core/models/template-manifest';
import { ICONS } from '../../../core/ui/icons';
import {
  TemplateRenderData,
  TemplateRendererComponent,
} from '../../../shared/components/template-renderer.component';

/**
 * Primeira tela do convite. Com capa: a imagem sem texto por cima. Sem capa:
 * a arte do próprio template, em modo `cover` (Bloco 16). A animação segue o
 * `open_style` do manifesto (≤ 1,5 s, `prefers-reduced-motion` respeitado)
 * e o botão "Ver convite" está sempre disponível.
 */
@Component({
  selector: 'app-invitation-welcome',
  imports: [FaIconComponent, TemplateRendererComponent],
  template: `
    <main class="flex flex-1 flex-col justify-center py-6 sm:py-10">
      <section
        class="mx-auto w-full max-w-2xl"
        [class]="'tpl-open-' + manifest().open_style"
        data-testid="invitation-welcome"
        [attr.data-open-style]="manifest().open_style"
      >
        @if (coverUrl(); as cover) {
          <div class="mx-auto overflow-hidden rounded-4xl">
            <img data-testid="invitation-welcome-cover" [src]="cover" [alt]="eventTitle()" class="block max-h-[46dvh] w-full object-cover" />
          </div>
        } @else {
          <div class="mx-auto overflow-hidden rounded-4xl" data-testid="invitation-welcome-art">
            <app-template-renderer
              [manifest]="manifest()"
              [data]="renderData()"
              mode="cover"
              [animate]="true"
            />
          </div>
        }

        <div class="flex flex-col items-center gap-4 px-5 py-7 text-center sm:py-9">
          <h1 class="font-display text-2xl font-semibold tracking-tight inv-ink sm:text-3xl">
            {{ i18n.t(welcomeTitleKey()) }}
          </h1>
          <p class="max-w-sm text-sm leading-6 inv-muted">
            {{ i18n.t(welcomeMessageKey(), { name: guestName() }) }}
          </p>
          <button
            type="button"
            data-testid="invitation-welcome-continue"
            class="inv-btn mt-1 w-full sm:w-auto sm:min-w-56"
            (click)="continue.emit()"
          >
            <fa-icon [icon]="icons['arrowRight']" aria-hidden="true" />
            {{ i18n.t('block14.welcome.open') }}
          </button>
        </div>
      </section>
    </main>
  `,
})
export class InvitationWelcomeComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly coverUrl = input<string | null>(null);
  readonly manifest = input<TemplateManifest>(DEFAULT_MANIFEST);
  readonly guestName = input('');
  readonly guestKind = input<GuestKindValue>(null);
  readonly eventTitle = input('');
  readonly templateData = input<TemplateRenderData | null>(null);

  readonly continue = output<void>();

  protected readonly renderData = computed<TemplateRenderData>(
    () =>
      this.templateData() ?? {
        title: this.eventTitle(),
        hostName: '',
        startsAt: null,
        timezone: 'Africa/Luanda',
        venue: '',
        city: '',
        message: '',
        coverUrl: this.coverUrl(),
      },
  );

  protected readonly welcomeTitleKey = computed(() =>
    guestPlural(this.guestKind()) ? 'block15.invitation.welcomeTitlePlural' : 'invitation.welcomeTitle',
  );
  protected readonly welcomeMessageKey = computed(() =>
    guestPlural(this.guestKind())
      ? 'block15.invitation.welcomeMessagePlural'
      : 'invitation.welcomeMessage',
  );
}
