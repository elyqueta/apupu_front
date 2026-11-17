import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Router } from '@angular/router';
import { ApiClient } from '../../core/api/api-client';
import { toApiError } from '../../core/api/api-error';
import {
  ApiRsvpStatus,
  PublicInvitation,
} from '../../core/api/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { EventStatus, RsvpStatus } from '../../core/models/models';
import { ShareService } from '../../core/services/share.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { BrandComponent } from '../../shared/components/brand.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { TemplateArtworkComponent } from '../../shared/components/template-artwork.component';

interface InvitationView {
  event: {
    title: string;
    hostName: string;
    startsAt: string;
    timezone: string;
    venue: string;
    city: string;
    onlineLink: string | null;
    message: string;
    rules: string;
    dressCode: string;
    templateId: null;
    status: EventStatus;
    contributionEnabled: boolean;
    bankDetails: {
      bankName: string;
      accountHolder: string;
      accountReference: string;
    } | null;
  };
  guest: { name: string; email: string; emailHasAccount: boolean; status: RsvpStatus };
  deadlinePassed: boolean;
  countdownDays: number;
}

@Component({
  selector: 'app-invitation-page',
  imports: [
    FaIconComponent,
    BrandComponent,
    ConfirmDialogComponent,
    PreferenceControlsComponent,
    SkeletonComponent,
    StatusBadgeComponent,
    TemplateArtworkComponent,
  ],
  templateUrl: './invitation.page.html',
})
export class InvitationPage {
  private readonly api = inject(ApiClient);
  private readonly toasts = inject(ToastService);
  private readonly share = inject(ShareService);
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
  protected readonly deadlinePassed = computed(
    () => this.invitation()?.deadlinePassed ?? false,
  );
  protected readonly countdownDays = computed(
    () => this.invitation()?.countdownDays ?? 0,
  );

  protected readonly saving = signal(false);
  protected readonly declineOpen = signal(false);
  protected readonly acceptOpen = signal(false);
  protected readonly accountDismissed = signal(false);

  constructor() {
    effect(() => {
      const token = this.token();
      void this.load(token);
    });
  }

  protected requestAccept(): void {
    if (this.saving() || this.deadlinePassed()) {
      return;
    }
    if (this.status() === 'declined') {
      this.acceptOpen.set(true);
      return;
    }
    void this.respond('accepted');
  }

  protected confirmAccept(): void {
    this.acceptOpen.set(false);
    void this.respond('accepted');
  }

  protected requestDecline(): void {
    if (this.saving() || this.deadlinePassed()) {
      return;
    }
    this.declineOpen.set(true);
  }

  protected confirmDecline(): void {
    this.declineOpen.set(false);
    void this.respond('declined');
  }

  protected retry(): void {
    void this.load(this.token());
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

  protected async copyAccountReference(): Promise<void> {
    const reference = this.invitation()?.event.bankDetails?.accountReference;
    if (!reference) {
      return;
    }
    const copied = await this.share.copy(reference);
    if (copied) {
      this.toasts.success(this.i18n.t('invitation.ibanCopied'));
    } else {
      this.toasts.error(this.i18n.t('common.copyError'));
    }
  }

  private async respond(status: Extract<ApiRsvpStatus, 'accepted' | 'declined'>): Promise<void> {
    const token = this.token();
    if (!this.invitation() || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.actionError.set('');
    try {
      const result = await this.api.put<PublicInvitation>(
        `/public/invitations/${encodeURIComponent(token)}/rsvp`,
        { status },
      );
      this.invitation.set(mapInvitation(result));
      this.toasts.success(
        status === 'accepted'
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
        this.invitation.set(mapInvitation(result));
      }
    } catch (error: unknown) {
      if (version === this.loadVersion) {
        const apiError = toApiError(error);
        this.loadError.set(
          apiError.status === 401 || apiError.status === 404
            ? this.i18n.t('invitation.unavailableText')
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

function mapInvitation(invitation: PublicInvitation): InvitationView {
  const event = invitation.event;
  const location = event.location;
  const contribution = event.contribution;
  const startsAt = event.starts_at;
  const countdownDays = Math.max(
    0,
    Math.ceil((new Date(startsAt).getTime() - Date.now()) / 86_400_000),
  );
  return {
    event: {
      title: event.title,
      hostName: event.host_name,
      startsAt,
      timezone: event.timezone,
      venue: location.name ?? location.address ?? '',
      city: location.name && location.address ? location.address : '',
      onlineLink: location.type === 'online' ? (location.online_url ?? null) : null,
      message: event.message ?? '',
      rules: event.rules ?? '',
      dressCode: event.dress_code ?? '',
      templateId: null,
      status: event.status === 'scheduled' ? 'published' : event.status,
      contributionEnabled: contribution.enabled,
      bankDetails:
        contribution.enabled &&
        contribution.bank_name &&
        contribution.account_holder &&
        contribution.account_reference
          ? {
              bankName: contribution.bank_name,
              accountHolder: contribution.account_holder,
              accountReference: contribution.account_reference,
            }
          : null,
    },
    guest: {
      name: invitation.guest.name,
      email: invitation.guest.email,
      emailHasAccount: invitation.guest.email_has_account,
      status: mapRsvpStatus(invitation.guest.rsvp_status),
    },
    deadlinePassed: invitation.rsvp_deadline_passed,
    countdownDays,
  };
}

function mapRsvpStatus(status: ApiRsvpStatus): RsvpStatus {
  return status === 'accepted' ? 'confirmed' : status;
}
