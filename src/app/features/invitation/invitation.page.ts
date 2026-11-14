import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { InvitationView, RsvpStatus } from '../../core/models/models';
import { ShareService } from '../../core/services/share.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { EVENT_TYPE_ICONS, ICONS } from '../../core/ui/icons';
import { BrandComponent } from '../../shared/components/brand.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { TemplateArtworkComponent } from '../../shared/components/template-artwork.component';

@Component({
  selector: 'app-invitation-page',
  imports: [
    RouterLink,
    FaIconComponent,
    BrandComponent,
    ConfirmDialogComponent,
    PreferenceControlsComponent,
    StatusBadgeComponent,
    TemplateArtworkComponent,
  ],
  templateUrl: './invitation.page.html',
})
export class InvitationPage {
  private readonly toasts = inject(ToastService);
  private readonly share = inject(ShareService);

  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly token = input.required<string>();

  protected readonly invitation = computed<InvitationView | null>(() =>
    this.store.findInvitation(this.token()),
  );

  protected readonly event = computed(() => this.invitation()?.event ?? null);
  protected readonly guest = computed(() => this.invitation()?.guest ?? null);
  protected readonly status = computed<RsvpStatus | null>(
    () => this.invitation()?.guest.status ?? null,
  );
  protected readonly deadlinePassed = computed(
    () => this.invitation()?.deadlinePassed ?? false,
  );
  protected readonly countdownDays = computed(() => this.invitation()?.countdownDays ?? 0);

  protected readonly saving = signal(false);
  protected readonly declineOpen = signal(false);
  protected readonly acceptOpen = signal(false);

  protected readonly typeLabel = computed(() => {
    const event = this.event();
    return event ? this.i18n.t(`type.${event.type}` as TranslationKey) : '';
  });

  protected readonly typeIcon = computed<IconDefinition>(() => {
    const event = this.event();
    return event ? (EVENT_TYPE_ICONS[event.type] ?? ICONS['star']) : ICONS['star'];
  });

  protected readonly templateName = computed(() => {
    const event = this.event();
    return event ? this.i18n.t(`template.${event.templateId}.name` as TranslationKey) : '';
  });

  protected requestAccept(): void {
    if (this.saving() || this.deadlinePassed()) {
      return;
    }
    if (this.status() === 'declined') {
      this.acceptOpen.set(true);
      return;
    }
    this.respond('confirmed');
  }

  protected confirmAccept(): void {
    this.acceptOpen.set(false);
    this.respond('confirmed');
  }

  protected requestDecline(): void {
    if (this.saving() || this.deadlinePassed()) {
      return;
    }
    this.declineOpen.set(true);
  }

  protected confirmDecline(): void {
    this.declineOpen.set(false);
    this.respond('declined');
  }

  protected async copyIban(): Promise<void> {
    const iban = this.event()?.bankDetails?.iban;
    if (!iban) {
      return;
    }
    const copied = await this.share.copy(iban);
    if (copied) {
      this.toasts.success(this.i18n.t('invitation.ibanCopied'));
    } else {
      this.toasts.error(this.i18n.t('common.copyError'));
    }
  }

  protected addCalendar(): void {
    this.toasts.info(this.i18n.t('invitation.calendarSoon'));
  }

  private respond(status: RsvpStatus): void {
    const view = this.invitation();
    if (!view || this.saving()) {
      return;
    }
    this.saving.set(true);
    setTimeout(() => {
      this.store.updateRsvp(view.guest.id, status);
      this.saving.set(false);
      this.toasts.success(
        status === 'confirmed'
          ? this.i18n.t('invitation.acceptSuccess')
          : this.i18n.t('invitation.declineSuccess'),
      );
    }, 550);
  }
}
