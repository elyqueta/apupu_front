import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';
import { ShareService } from '../../../core/services/share.service';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { ModalComponent } from '../../../shared/components/modal.component';
import { InvitationEventView } from '../invitation.models';

/** Contacto mínimo do anfitrião: avatar, nome, WhatsApp e e-mail. */
@Component({
  selector: 'app-invitation-host-dialog',
  imports: [FaIconComponent, AvatarComponent, ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('invitation.hostTitle')"
      size="sm"
      (closed)="closed.emit()"
    >
      <div class="flex flex-col items-center gap-3 text-center">
        <app-avatar
          [name]="event().hostName"
          [imageUrl]="event().hostAvatarUrl"
          size="xl"
        />
        <div>
          <p class="text-lg font-semibold text-ink">{{ event().hostName }}</p>
          <p class="mt-1 text-xs text-muted">{{ i18n.t('invitation.hostNote') }}</p>
        </div>
      </div>

      <div class="mt-5 flex flex-col gap-2">
        @if (whatsappUrl(); as whatsapp) {
          <a
            [href]="whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="invitation-host-whatsapp"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover"
          >
            <fa-icon [icon]="icons['whatsapp']" aria-hidden="true" />
            {{ i18n.t('invitation.whatsapp') }}
          </a>
        }
        <a
          [href]="mailto()"
          data-testid="invitation-host-email"
          class="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:border-brand/40"
        >
          <fa-icon [icon]="icons['envelope']" aria-hidden="true" />
          {{ i18n.t('invitation.emailHost') }}
        </a>
      </div>
    </app-modal>
  `,
})
export class InvitationHostDialogComponent {
  protected readonly i18n = inject(I18nService);
  private readonly share = inject(ShareService);

  protected readonly icons = ICONS;

  readonly open = input(false);
  readonly event = input.required<InvitationEventView>();

  readonly closed = output<void>();

  protected readonly whatsappUrl = computed(() => {
    const event = this.event();
    return this.share.whatsappUrl(
      event.hostPhone,
      this.i18n.t('invitation.whatsappText', { name: event.hostName }),
    );
  });

  protected readonly mailto = computed(() => `mailto:${this.event().hostEmail}`);
}
