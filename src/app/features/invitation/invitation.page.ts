import { InvitationOrganizersComponent } from './parts/invitation-organizers.component';
import { InvitationVideoComponent } from './parts/invitation-video.component';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Router } from '@angular/router';
import { ApiClient } from '../../core/api/api-client';
import { toApiError } from '../../core/api/api-error';
import { PublicInvitation } from '../../core/api/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { RsvpStatus } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { BrandComponent } from '../../shared/components/brand.component';
import { ImageLightboxComponent } from '../../shared/components/image-lightbox.component';
import { LogoComponent } from '../../shared/components/logo.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { mapPublicInvitation } from './invitation.mapper';
import {
  InvitationResponseInput,
  InvitationResponseStatus,
  InvitationView,
} from './invitation.models';
import { InvitationCancelledComponent } from './parts/invitation-cancelled.component';
import { InvitationDetailsDialogComponent } from './parts/invitation-details-dialog.component';
import { InvitationDetailsMenuComponent } from './parts/invitation-details-menu.component';
import { InvitationHeroComponent } from './parts/invitation-hero.component';
import { InvitationHostDialogComponent } from './parts/invitation-host-dialog.component';
import { InvitationKeyInfoComponent } from './parts/invitation-key-info.component';
import { InvitationLocationDialogComponent } from './parts/invitation-location-dialog.component';
import { InvitationReplyComponent } from './parts/invitation-reply.component';
import { InvitationRsvpComponent } from './parts/invitation-rsvp.component';
import { InvitationRsvpDialogComponent } from './parts/invitation-rsvp-dialog.component';
import { InvitationShareComponent } from './parts/invitation-share.component';
import { InvitationWelcomeComponent } from './parts/invitation-welcome.component';
import { GratitudeInvitationComponent } from './parts/gratitude-invitation.component';

@Component({
  selector: 'app-invitation-page',
  imports: [
    FaIconComponent,
    InvitationVideoComponent,
    InvitationOrganizersComponent,
    BrandComponent,
    ImageLightboxComponent,
    LogoComponent,
    PreferenceControlsComponent,
    SkeletonComponent,
    InvitationCancelledComponent,
    InvitationHeroComponent,
    InvitationKeyInfoComponent,
    InvitationReplyComponent,
    InvitationRsvpComponent,
    InvitationShareComponent,
    InvitationWelcomeComponent,
    InvitationDetailsMenuComponent,
    InvitationDetailsDialogComponent,
    InvitationHostDialogComponent,
    InvitationLocationDialogComponent,
    InvitationRsvpDialogComponent,
    GratitudeInvitationComponent,
  ],
  templateUrl: './invitation.page.html',
})
export class InvitationPage {
  private readonly api = inject(ApiClient);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private loadVersion = 0;

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly token = input.required<string>();

  protected readonly invitation = signal<InvitationView | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly actionError = signal('');
  protected readonly status = computed<RsvpStatus | null>(
    () => this.invitation()?.guest.status ?? null,
  );
  protected readonly deadlinePassed = computed(() => this.invitation()?.deadlinePassed ?? false);
  protected readonly countdownDays = computed(() => this.invitation()?.countdownDays ?? 0);
  protected readonly eventCancelled = computed(
    () => this.invitation()?.event.status === 'cancelled',
  );
  protected readonly isGratitude = computed(() => {
    const event = this.invitation()?.event;
    return event?.templateSlug === 'gratitude' || event?.manifest?.ornaments?.frame === 'gratitude';
  });
  protected readonly showWelcome = signal(false);

  protected readonly saving = signal(false);
  protected readonly accountDismissed = signal(false);
  protected readonly lightbox = signal<{ src: string; alt: string } | null>(null);
  protected readonly locationOpen = signal(false);
  protected readonly hostOpen = signal(false);
  protected readonly detailsOpen = signal(false);
  protected readonly rsvpDialog = signal<InvitationResponseStatus | null>(null);

  constructor() {
    effect(() => {
      void this.load(this.token());
    });
  }

  protected requestRsvp(status: InvitationResponseStatus): void {
    if (this.saving() || this.deadlinePassed() || this.eventBlocked()) {
      return;
    }
    this.actionError.set('');
    this.rsvpDialog.set(status);
  }

  protected confirmRsvp(input: InvitationResponseInput): void {
    this.actionError.set('');
    void this.respond(input);
  }

  protected closeRsvpDialog(): void {
    if (!this.saving()) {
      this.rsvpDialog.set(null);
    }
  }

  protected retry(): void {
    void this.load(this.token());
  }

  protected continueToInvitation(): void {
    this.showWelcome.set(false);
  }

  protected createAccount(useSameEmail: boolean): void {
    const email = this.invitation()?.guest.email ?? '';
    const queryParams: Record<string, string | number> = {
      returnUrl: `/convite/${this.token()}`,
    };
    if (useSameEmail && email) {
      queryParams['email'] = email;
      queryParams['enviar'] = 1;
    }
    void this.router.navigate(['/criar-conta'], { queryParams });
  }

  protected loginInstead(): void {
    const email = this.invitation()?.guest.email ?? '';
    void this.router.navigate(['/entrar'], {
      queryParams: { email, returnUrl: `/convite/${this.token()}` },
    });
  }

  protected dismissAccount(): void {
    this.accountDismissed.set(true);
  }

  protected openCover(): void {
    const event = this.invitation()?.event;
    if (event?.coverUrl) {
      this.lightbox.set({ src: event.coverUrl, alt: event.title });
    }
  }

  protected closeCover(): void {
    this.lightbox.set(null);
  }

  private eventBlocked(): boolean {
    const status = this.invitation()?.event.status;
    return status === 'cancelled' || status === 'completed';
  }

  private async respond(input: InvitationResponseInput): Promise<void> {
    if (!this.invitation() || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      const result = await this.api.put<PublicInvitation>(
        `/public/invitations/${encodeURIComponent(this.token())}/rsvp`,
        { status: input.status, message: input.message },
      );
      this.invitation.set(mapPublicInvitation(result));
      this.rsvpDialog.set(null);
      this.toasts.success(
        input.status === 'accepted'
          ? this.i18n.t('invitation.acceptSuccess')
          : this.i18n.t('invitation.declineSuccess'),
      );
    } catch (error: unknown) {
      this.actionError.set(toApiError(error).message);
    } finally {
      this.saving.set(false);
    }
  }

  private async load(token: string): Promise<void> {
    const version = ++this.loadVersion;
    this.loading.set(true);
    this.loadError.set('');
    this.actionError.set('');
    this.accountDismissed.set(false);
    this.invitation.set(null);
    this.showWelcome.set(false);
    const path = `/public/invitations/${encodeURIComponent(token)}`;
    try {
      let result: PublicInvitation;
      try {
        result = await this.api.get<PublicInvitation>(path);
      } catch (error: unknown) {
        const apiError = toApiError(error);
        if (apiError.status !== 401 && apiError.status !== 404) {
          throw apiError;
        }
        result = await this.api.post<PublicInvitation>(`${path}/claim`);
      }
      if (version === this.loadVersion) {
        const view = mapPublicInvitation(result);
        this.invitation.set(view);
        // Bloco 14: sem capa, abre no estilo do template (salvo `open_style: none`).
        this.showWelcome.set(
          (Boolean(view.event.coverUrl) ||
            (view.event.templateSlug !== null && view.event.manifest.open_style !== 'none')) &&
            view.event.status !== 'cancelled',
        );
      }
    } catch (error: unknown) {
      if (version === this.loadVersion) {
        const apiError = toApiError(error);
        this.loadError.set(
          apiError.status === 401 || apiError.status === 404
            ? this.i18n.t('invitation.inactiveText')
            : apiError.message,
        );
      }
    } finally {
      if (version === this.loadVersion) {
        this.loading.set(false);
      }
    }
  }
}
