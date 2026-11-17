import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ApiClient } from '../../core/api/api-client';
import { toApiError } from '../../core/api/api-error';
import { ApiEvent, ApiEventAccessRole, ApiInvitation } from '../../core/api/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { BrandComponent } from '../../shared/components/brand.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

interface EventDetailResponse {
  event: ApiEvent;
  invitations: ApiInvitation[];
}

@Component({
  selector: 'app-management-event-page',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    FaIconComponent,
    BrandComponent,
    PreferenceControlsComponent,
    SkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './management-event.page.html',
})
export class ManagementEventPage {
  private readonly api = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly event = signal<ApiEvent | null>(null);
  protected readonly invitations = signal<ApiInvitation[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly actionError = signal('');
  protected readonly feedback = signal('');
  protected readonly pendingAction = signal<string | null>(null);
  protected readonly role = signal<ApiEventAccessRole>('host');

  protected readonly guestForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.maxLength(40)]],
  });

  protected readonly editForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    venue: ['', [Validators.maxLength(200)]],
    city: ['', [Validators.maxLength(300)]],
    message: ['', [Validators.maxLength(4000)]],
    rules: ['', [Validators.maxLength(4000)]],
    dressCode: ['', [Validators.maxLength(200)]],
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const eventId = params.get('eventId');
      if (eventId) {
        void this.load(eventId);
      }
    });
  }

  protected isHost(): boolean {
    return this.role() === 'host';
  }

  protected async retry(): Promise<void> {
    const eventId = this.route.snapshot.paramMap.get('eventId');
    if (eventId) {
      await this.load(eventId);
    }
  }

  protected async addGuest(): Promise<void> {
    const event = this.event();
    if (!event || this.guestForm.invalid || this.pendingAction()) {
      this.guestForm.markAllAsTouched();
      return;
    }
    this.pendingAction.set('add');
    this.actionError.set('');
    this.feedback.set('');
    const value = this.guestForm.getRawValue();
    try {
      const guest = await this.api.post<ApiInvitation>(
        `/host/events/${encodeURIComponent(event.id)}/invitations`,
        {
          name: value.name.trim(),
          email: value.email.trim(),
          phone: value.phone.trim() || null,
        },
      );
      const guests = [guest, ...this.invitations()];
      this.invitations.set(guests);
      this.syncEventStats(guests);
      this.guestForm.reset();
      this.feedback.set(this.i18n.t('management.guestAdded'));
    } catch (error: unknown) {
      this.actionError.set(toApiError(error).message);
    } finally {
      this.pendingAction.set(null);
    }
  }

  protected async saveDetails(): Promise<void> {
    const event = this.event();
    if (!event || this.pendingAction()) {
      return;
    }
    const value = this.editForm.getRawValue();
    const online = event.location.type === 'online';
    const venueMissing = !online && value.venue.trim().length === 0;
    if (this.editForm.invalid || venueMissing) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.pendingAction.set('details');
    this.actionError.set('');
    this.feedback.set('');
    const body: Record<string, unknown> = {
      title: value.title.trim(),
      message: value.message.trim(),
      rules: value.rules.trim(),
      dress_code: value.dressCode.trim(),
    };
    if (online) {
      body['location'] = { type: 'online', online_url: event.location.online_url ?? '' };
    } else {
      body['location'] = {
        type: 'venue',
        name: value.venue.trim(),
        address: value.city.trim() || null,
      };
    }
    try {
      const updated = await this.api.patch<ApiEvent>(
        `/host/events/${encodeURIComponent(event.id)}`,
        body,
      );
      this.event.set({ ...updated, stats: updated.stats ?? event.stats });
      this.feedback.set(this.i18n.t('management.detailsSaved'));
    } catch (error: unknown) {
      this.actionError.set(toApiError(error).message);
    } finally {
      this.pendingAction.set(null);
    }
  }

  protected async resend(guest: ApiInvitation): Promise<void> {
    if (this.pendingAction()) {
      return;
    }
    this.pendingAction.set(guest.id);
    this.actionError.set('');
    this.feedback.set('');
    try {
      await this.api.postNoContent(
        `/host/events/${encodeURIComponent(guest.event_id)}/invitations/${encodeURIComponent(guest.id)}/resend`,
      );
      this.feedback.set(this.i18n.t('management.resendDone'));
    } catch (error: unknown) {
      this.actionError.set(toApiError(error).message);
    } finally {
      this.pendingAction.set(null);
    }
  }

  protected async remove(guest: ApiInvitation): Promise<void> {
    if (this.pendingAction() || !window.confirm(this.i18n.t('management.guestRemovedConfirm'))) {
      return;
    }
    this.pendingAction.set(guest.id);
    this.actionError.set('');
    this.feedback.set('');
    try {
      await this.api.delete(
        `/host/events/${encodeURIComponent(guest.event_id)}/invitations/${encodeURIComponent(guest.id)}`,
      );
      const guests = this.invitations().filter((item) => item.id !== guest.id);
      this.invitations.set(guests);
      this.syncEventStats(guests);
      this.feedback.set(this.i18n.t('management.guestRemoved'));
    } catch (error: unknown) {
      this.actionError.set(toApiError(error).message);
    } finally {
      this.pendingAction.set(null);
    }
  }

  protected async endSession(): Promise<void> {
    const event = this.event();
    if (!event || this.pendingAction()) {
      return;
    }
    this.pendingAction.set('end');
    this.actionError.set('');
    try {
      await this.api.delete(`/host/session/${encodeURIComponent(event.id)}`);
      await this.router.navigate(['/gestao'], { replaceUrl: true });
    } catch (error: unknown) {
      this.actionError.set(toApiError(error).message);
      this.pendingAction.set(null);
    }
  }

  protected rsvpLabel(status: ApiInvitation['rsvp_status']): string {
    return this.i18n.t(
      status === 'accepted'
        ? 'management.accepted'
        : status === 'declined'
          ? 'management.declined'
          : 'management.pending',
    );
  }

  protected eventDate(event: ApiEvent): string {
    return event.starts_at
      ? this.i18n.dateTime(event.starts_at, event.timezone)
      : this.i18n.t('common.notAvailable');
  }

  private async load(eventId: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.api.get<EventDetailResponse>(
        `/host/events/${encodeURIComponent(eventId)}`,
      );
      this.event.set(result.event);
      this.invitations.set(result.invitations);
      this.role.set(result.event.access_role ?? 'host');
      this.editForm.reset({
        title: result.event.title,
        venue: result.event.location.name ?? '',
        city: result.event.location.address ?? '',
        message: result.event.message ?? '',
        rules: result.event.rules ?? '',
        dressCode: result.event.dress_code ?? '',
      });
    } catch (error: unknown) {
      const apiError = toApiError(error);
      this.error.set(
        apiError.status === 401 || apiError.status === 404
          ? this.i18n.t('management.eventUnavailable')
          : apiError.message,
      );
    } finally {
      this.loading.set(false);
    }
  }

  private syncEventStats(guests: ApiInvitation[]): void {
    this.event.update((event) =>
      event
        ? {
            ...event,
            stats: {
              total_invitations: guests.length,
              accepted: guests.filter((guest) => guest.rsvp_status === 'accepted').length,
              declined: guests.filter((guest) => guest.rsvp_status === 'declined').length,
              pending: guests.filter((guest) => guest.rsvp_status === 'pending').length,
            },
          }
        : event,
    );
  }
}
