import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ApiClient } from '../../core/api/api-client';
import { toApiError } from '../../core/api/api-error';
import {
  ApiActivity,
  ApiEvent,
  ApiEventAccessRole,
  ApiInvitation,
  Pagination,
} from '../../core/api/api.models';
import { normalizeActivityKind } from '../../core/api/mappers';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { EventActivity } from '../../core/models/models';
import { ICONS } from '../../core/ui/icons';
import { ActivityPresenter } from '../../shared/services/activity.presenter';
import { BrandComponent } from '../../shared/components/brand.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { PhoneMaskDirective } from '../../shared/directives/phone-mask.directive';

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
    ConfirmDialogComponent,
    PreferenceControlsComponent,
    SkeletonComponent,
    StatusBadgeComponent,
    PhoneMaskDirective,
  ],
  templateUrl: './management-event.page.html',
})
export class ManagementEventPage {
  private readonly api = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly activityPresenter = inject(ActivityPresenter);

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly event = signal<ApiEvent | null>(null);
  protected readonly invitations = signal<ApiInvitation[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly actionError = signal('');
  protected readonly feedback = signal('');
  protected readonly pendingAction = signal<string | null>(null);
  protected readonly confirmTarget = signal<{ kind: 'guest' | 'activity'; id: string } | null>(
    null,
  );
  protected readonly role = signal<ApiEventAccessRole>('host');
  protected readonly activityItems = signal<ApiActivity[]>([]);
  protected readonly activityPagination = signal<Pagination | null>(null);
  protected readonly activityLoading = signal(false);
  protected readonly coverUploading = signal(false);
  protected readonly coverProgress = signal(0);
  private coverUploadHandle: { cancel: () => void } | null = null;

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

  protected readonly coverForm = this.formBuilder.nonNullable.group({
    url: ['', [Validators.pattern(/^https:\/\/.+/), Validators.maxLength(500)]],
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

  protected remove(guest: ApiInvitation): void {
    if (!this.pendingAction()) {
      this.confirmTarget.set({ kind: 'guest', id: guest.id });
    }
  }

  protected removeActivity(item: ApiActivity): void {
    if (!this.pendingAction()) {
      this.confirmTarget.set({ kind: 'activity', id: item.id });
    }
  }

  protected confirmMessage(): string {
    const key: TranslationKey =
      this.confirmTarget()?.kind === 'activity'
        ? 'management.activityRemoveConfirm'
        : 'management.guestRemovedConfirm';
    return this.i18n.t(key);
  }

  protected async confirmRemoval(): Promise<void> {
    const target = this.confirmTarget();
    this.confirmTarget.set(null);
    if (!target || this.pendingAction()) {
      return;
    }
    if (target.kind === 'guest') {
      const guest = this.invitations().find((item) => item.id === target.id);
      if (!guest) {
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
      return;
    }

    const item = this.activityItems().find((entry) => entry.id === target.id);
    if (!item) {
      return;
    }
    this.pendingAction.set(item.id);
    this.actionError.set('');
    this.feedback.set('');
    try {
      await this.api.delete(
        `/host/events/${encodeURIComponent(item.event_id)}/activity/${encodeURIComponent(item.id)}`,
      );
      this.activityItems.update((items) => items.filter((entry) => entry.id !== item.id));
      this.feedback.set(this.i18n.t('management.activityRemoved'));
      await this.loadActivity(1);
    } catch (error: unknown) {
      this.actionError.set(toApiError(error).message);
    } finally {
      this.pendingAction.set(null);
    }
  }

  protected async loadActivity(page = 1): Promise<void> {
    const event = this.event();
    if (!event) {
      return;
    }
    this.activityLoading.set(true);
    try {
      const result = await this.api.getPage<ApiActivity>(
        `/host/events/${encodeURIComponent(event.id)}/activity`,
        { page, page_size: 8 },
      );
      this.activityItems.set(result.data);
      this.activityPagination.set(result.pagination);
    } catch (error: unknown) {
      this.activityItems.set([]);
      this.activityPagination.set(null);
      this.actionError.set(toApiError(error).message);
    } finally {
      this.activityLoading.set(false);
    }
  }

  protected goToActivityPage(page: number): void {
    const pagination = this.activityPagination();
    if (!pagination || page < 1 || page > pagination.total_pages || page === pagination.page) {
      return;
    }
    void this.loadActivity(page);
  }

  protected activityText(item: ApiActivity): string {
    const mapped: EventActivity = {
      id: item.id,
      eventId: item.event_id,
      eventTitle: this.event()?.title ?? null,
      kind: normalizeActivityKind(item.kind),
      guestName: item.guest_name,
      at: item.at,
    };
    return this.activityPresenter.text(mapped, this.event()?.title ?? '');
  }

  protected activityIcon(kind: string): IconDefinition {
    return this.activityPresenter.icon(normalizeActivityKind(kind));
  }

  protected activityTone(kind: string): string {
    return this.activityPresenter.tone(normalizeActivityKind(kind));
  }

  protected async setCoverUrl(): Promise<void> {
    const event = this.event();
    if (!event || this.pendingAction() || this.coverForm.invalid) {
      this.coverForm.markAllAsTouched();
      return;
    }
    const url = this.coverForm.controls.url.value.trim();
    if (!url) {
      return;
    }
    this.pendingAction.set('cover');
    this.actionError.set('');
    this.feedback.set('');
    try {
      const updated = await this.api.put<ApiEvent>(
        `/host/events/${encodeURIComponent(event.id)}/cover`,
        { cover_url: url },
      );
      this.event.set({ ...updated, stats: updated.stats ?? event.stats });
      this.feedback.set(this.i18n.t('management.coverSaved'));
    } catch (error: unknown) {
      this.actionError.set(toApiError(error).message);
    } finally {
      this.pendingAction.set(null);
    }
  }

  protected onCoverFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      void this.uploadCover(file);
    }
  }

  protected async uploadCover(file: File): Promise<void> {
    const event = this.event();
    if (!event || this.coverUploading()) {
      return;
    }
    this.coverUploading.set(true);
    this.coverProgress.set(0);
    this.actionError.set('');
    this.feedback.set('');
    const body = new FormData();
    body.append('cover', file);
    const handle = this.api.postFormWithProgress<ApiEvent>(
      `/host/events/${encodeURIComponent(event.id)}/cover/upload`,
      body,
      { onProgress: (percent) => this.coverProgress.set(percent) },
    );
    this.coverUploadHandle = handle;
    try {
      const updated = await handle.promise;
      this.event.set({ ...updated, stats: updated.stats ?? event.stats });
      this.coverProgress.set(100);
      this.feedback.set(this.i18n.t('management.coverUploaded'));
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.actionError.set(toApiError(error).message);
      }
    } finally {
      this.coverUploading.set(false);
      this.coverUploadHandle = null;
      this.coverProgress.set(0);
    }
  }

  protected cancelCoverUpload(): void {
    this.coverUploadHandle?.cancel();
    this.coverUploading.set(false);
    this.coverProgress.set(0);
  }

  protected async removeCover(): Promise<void> {
    const event = this.event();
    if (!event || this.pendingAction()) {
      return;
    }
    this.pendingAction.set('cover');
    this.actionError.set('');
    this.feedback.set('');
    try {
      const updated = await this.api.deleteWithData<ApiEvent>(
        `/host/events/${encodeURIComponent(event.id)}/cover`,
      );
      this.event.set({ ...updated, stats: updated.stats ?? event.stats });
      this.coverForm.reset({ url: '' });
      this.feedback.set(this.i18n.t('management.coverRemoved'));
    } catch (error: unknown) {
      this.actionError.set(toApiError(error).message);
    } finally {
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
      this.coverForm.reset({ url: result.event.cover_url ?? '' });
      await this.loadActivity(1);
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
