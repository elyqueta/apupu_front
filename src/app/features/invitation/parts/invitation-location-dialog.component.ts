import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';
import { ShareService } from '../../../core/services/share.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal.component';
import { InvitationEventView } from '../invitation.models';

/** Localização do evento: copiar endereço e abrir Google Maps por link simples. */
@Component({
  selector: 'app-invitation-location-dialog',
  imports: [FaIconComponent, ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('invitation.locationTitle')"
      presentation="sheet"
      size="md"
      (closed)="closed.emit()"
    >
      @if (event().onlineLink; as online) {
        <div class="flex flex-col gap-4">
          <p class="flex items-center gap-2 text-sm font-semibold text-ink">
            <fa-icon [icon]="icons['display']" class="text-aqua" aria-hidden="true" />
            {{ i18n.t('invitation.onlineEvent') }}
          </p>
          <a
            [href]="online"
            target="_blank"
            rel="noopener noreferrer"
            class="ui-btn"
          >
            <fa-icon [icon]="icons['arrowUpRight']" aria-hidden="true" />
            {{ i18n.t('invitation.openOnlineLink') }}
          </a>
        </div>
      } @else if (fullAddress()) {
        <div class="flex flex-col gap-4">
          @if (event().venue) {
            <div>
              <p class="text-xs font-semibold text-muted">{{ i18n.t('invitation.where') }}</p>
              <p class="mt-1 text-base font-semibold text-ink">{{ event().venue }}</p>
            </div>
          }
          <div class="rounded-2xl border border-line bg-surface-raised p-4">
            <p class="text-xs font-semibold text-muted">{{ i18n.t('invitation.address') }}</p>
            <p class="mt-1 text-sm leading-6 text-ink">{{ fullAddress() }}</p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              data-testid="invitation-copy-address"
              class="ui-btn-secondary flex-1"
              (click)="copyAddress()"
            >
              <fa-icon [icon]="icons['copy']" aria-hidden="true" />
              {{ i18n.t('invitation.copyAddress') }}
            </button>
            <a
              [href]="mapsUrl()"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="invitation-open-maps"
              class="ui-btn flex-1"
            >
              <fa-icon [icon]="icons['location']" aria-hidden="true" />
              {{ i18n.t('invitation.openMaps') }}
            </a>
          </div>
        </div>
      } @else {
        <p class="text-sm leading-6 text-muted">{{ i18n.t('invitation.noAddress') }}</p>
      }
    </app-modal>
  `,
})
export class InvitationLocationDialogComponent {
  protected readonly i18n = inject(I18nService);
  private readonly share = inject(ShareService);
  private readonly toasts = inject(ToastService);

  protected readonly icons = ICONS;

  readonly open = input(false);
  readonly event = input.required<InvitationEventView>();

  readonly closed = output<void>();

  protected readonly fullAddress = computed(() => {
    const event = this.event();
    return [event.address, event.city].filter((part) => part && part !== event.address).join(', ') || event.address;
  });

  protected readonly mapsUrl = computed(
    () =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.fullAddress())}`,
  );

  protected async copyAddress(): Promise<void> {
    const address = this.fullAddress();
    if (!address) {
      return;
    }
    const copied = await this.share.copy(address);
    if (copied) {
      this.toasts.success(this.i18n.t('invitation.addressCopied'));
    } else {
      this.toasts.error(this.i18n.t('common.copyError'));
    }
  }
}
