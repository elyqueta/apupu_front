import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ApiClient } from '../../core/api/api-client';
import { toApiError } from '../../core/api/api-error';
import {
  ApiOpenEvent,
  ApiOpenEventEnvelope,
  ApiOpenEventRsvpResult,
  ApiOpenEventViewer,
} from '../../core/api/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ICONS } from '../../core/ui/icons';
import { isValidPhone, phoneDigits } from '../../core/utils/phone.util';
import { BrandComponent } from '../../shared/components/brand.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { PhoneMaskDirective } from '../../shared/directives/phone-mask.directive';
import { countdownDaysUntil, mapPublicEventView } from '../invitation/invitation.mapper';
import { InvitationEventView } from '../invitation/invitation.models';
import { InvitationCancelledComponent } from '../invitation/parts/invitation-cancelled.component';
import { InvitationDetailsDialogComponent } from '../invitation/parts/invitation-details-dialog.component';
import { InvitationDetailsMenuComponent } from '../invitation/parts/invitation-details-menu.component';
import { InvitationHeroComponent } from '../invitation/parts/invitation-hero.component';
import { InvitationHostDialogComponent } from '../invitation/parts/invitation-host-dialog.component';
import { InvitationKeyInfoComponent } from '../invitation/parts/invitation-key-info.component';
import { InvitationLocationDialogComponent } from '../invitation/parts/invitation-location-dialog.component';

type LoadState = 'loading' | 'ready' | 'not_found' | 'error';
type Answer = 'accepted' | 'declined';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Página do link aberto de um evento público (`/e/:slug`, Bloco 10).
 *
 * Reutiliza as peças do convite (capa, informação principal, detalhes,
 * contacto e localização) e acrescenta o formulário "Confirmar presença":
 * nome + e-mail ou telefone (+ idade quando o evento tem restrição). Com
 * conta autenticada os dados vêm da conta, só de leitura. Qualquer recusa
 * por idade mostra sempre a mesma mensagem genérica.
 */
@Component({
  selector: 'app-public-event-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FaIconComponent,
    BrandComponent,
    PreferenceControlsComponent,
    SkeletonComponent,
    PhoneMaskDirective,
    InvitationCancelledComponent,
    InvitationHeroComponent,
    InvitationKeyInfoComponent,
    InvitationDetailsMenuComponent,
    InvitationDetailsDialogComponent,
    InvitationHostDialogComponent,
    InvitationLocationDialogComponent,
  ],
  templateUrl: './public-event.page.html',
})
export class PublicEventPage {
  private readonly api = inject(ApiClient);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  /** Parâmetro de rota (`withComponentInputBinding`). */
  readonly slug = input('');

  protected readonly state = signal<LoadState>('loading');
  protected readonly raw = signal<ApiOpenEvent | null>(null);
  protected readonly viewer = signal<ApiOpenEventViewer | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly blockedByAge = signal(false);
  protected readonly submitted = signal(false);
  protected readonly result = signal<{ name: string; status: Answer } | null>(null);
  protected readonly editing = signal(true);

  protected readonly detailsOpen = signal(false);
  protected readonly hostOpen = signal(false);
  protected readonly locationOpen = signal(false);

  protected readonly form = this.fb.group({
    name: ['', [Validators.maxLength(120)]],
    email: ['', [Validators.maxLength(254)]],
    phone: [''],
    age: [''],
    message: ['', [Validators.maxLength(500)]],
    website: [''],
  });

  protected readonly event = computed<InvitationEventView | null>(() => {
    const raw = this.raw();
    return raw ? mapPublicEventView(raw) : null;
  });
  protected readonly countdownDays = computed(() => {
    const event = this.event();
    return event ? countdownDaysUntil(event.startsAt) : 0;
  });
  protected readonly restricted = computed(() => this.raw()?.has_age_restriction ?? false);
  protected readonly attendeeCount = computed(() => this.raw()?.attendee_count ?? null);
  protected readonly cancelled = computed(() => this.event()?.status === 'cancelled');
  protected readonly closed = computed(() => {
    const raw = this.raw();
    if (!raw) return false;
    const end = new Date(raw.ends_at ?? raw.starts_at).getTime();
    return raw.rsvp_deadline_passed || raw.status === 'completed' || end <= Date.now();
  });
  /** O anfitrião a ver o próprio link: não responde (como nos convites individuais). */
  protected readonly viewerIsHost = computed(() => {
    const viewer = this.viewer();
    const hostEmail = this.raw()?.host_email;
    return !!viewer && !!hostEmail && viewer.email.trim().toLowerCase() === hostEmail.trim().toLowerCase();
  });
  /** Conta sem data de nascimento num evento com restrição: não confirma. */
  protected readonly accountNeedsBirthDate = computed(
    () => this.restricted() && !!this.viewer() && !this.viewer()!.has_birth_date,
  );

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (slug) {
        void this.load(slug);
      }
    });
  }

  protected async load(slug = this.slug()): Promise<void> {
    this.state.set('loading');
    try {
      const data = await this.api.get<ApiOpenEventEnvelope>(
        `/public/events/${encodeURIComponent(slug)}`,
      );
      this.raw.set(data.event);
      this.viewer.set(data.viewer);
      const existing = data.viewer?.rsvp_status;
      if (data.viewer && existing && existing !== 'pending') {
        this.result.set({ name: data.viewer.name, status: existing });
        this.editing.set(false);
      }
      this.state.set('ready');
    } catch (error: unknown) {
      this.state.set(toApiError(error).status === 404 ? 'not_found' : 'error');
    }
  }

  /** Validação local; devolve a primeira mensagem de erro ('' quando válido). */
  private validate(answer: Answer): string {
    if (this.viewer()) {
      if (answer === 'accepted' && this.accountNeedsBirthDate()) {
        return this.i18n.t('block10.public.ageProfileRequired');
      }
      return '';
    }
    const value = this.form.getRawValue();
    const name = value.name.trim();
    if (name.length < 2 || name.length > 120) return this.i18n.t('block10.public.nameError');
    const email = value.email.trim();
    const phone = phoneDigits(value.phone);
    if (!email && !phone) return this.i18n.t('block10.public.contactError');
    if (email && !EMAIL_PATTERN.test(email)) return this.i18n.t('block10.public.emailError');
    if (phone && !isValidPhone(value.phone)) return this.i18n.t('common.phoneInvalid');
    if (answer === 'accepted' && this.restricted()) {
      const age = value.age.trim();
      if (!/^\d{1,3}$/.test(age) || Number(age) > 120) {
        return this.i18n.t('block10.public.ageError');
      }
    }
    return '';
  }

  protected async respond(answer: Answer): Promise<void> {
    if (this.saving()) return;
    this.submitted.set(true);
    this.blockedByAge.set(false);
    const localError = this.validate(answer);
    this.formError.set(localError);
    if (localError) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const body: Record<string, unknown> = {
      status: answer,
      message: value.message.trim() || null,
      website: value.website,
    };
    if (!this.viewer()) {
      body['name'] = value.name.trim();
      if (value.email.trim()) body['email'] = value.email.trim();
      if (phoneDigits(value.phone)) body['phone'] = phoneDigits(value.phone);
      if (answer === 'accepted' && this.restricted()) body['age'] = Number(value.age.trim());
    }

    this.saving.set(true);
    try {
      const response = await this.api.post<ApiOpenEventRsvpResult>(
        `/public/events/${encodeURIComponent(this.slug())}/rsvp`,
        body,
      );
      this.raw.set(response.event);
      const status = response.rsvp.status === 'declined' ? 'declined' : 'accepted';
      this.result.set({ name: response.rsvp.name, status });
      this.editing.set(false);
      this.formError.set('');
    } catch (error: unknown) {
      this.formError.set(this.messageFor(error));
    } finally {
      this.saving.set(false);
    }
  }

  private messageFor(error: unknown): string {
    const apiError = toApiError(error);
    const byCode: Partial<Record<string, TranslationKey>> = {
      public_rsvp_refused: 'block10.public.refused',
      public_rsvp_personal_invite: 'block10.public.personalInvite',
      public_rsvp_host: 'block10.public.hostSelf',
      age_profile_required: 'block10.public.ageProfileRequired',
      rate_limited: 'block10.public.rateLimited',
      event_cancelled: 'block10.public.cancelled',
      event_completed: 'block10.public.closed',
      rsvp_deadline_passed: 'block10.public.closed',
      public_event_not_found: 'block10.public.notFound',
    };
    if (apiError.code === 'public_rsvp_refused') {
      this.blockedByAge.set(true);
    }
    const key = byCode[apiError.code];
    if (key) return this.i18n.t(key);
    if (apiError.code === 'validation_failed') {
      const fields = apiError.fields;
      if (fields['name']) return this.i18n.t('block10.public.nameError');
      if (fields['contact']) return this.i18n.t('block10.public.contactError');
      if (fields['email']) return this.i18n.t('block10.public.emailError');
      if (fields['phone']) return this.i18n.t('common.phoneInvalid');
      if (fields['age']) return this.i18n.t('block10.public.ageError');
    }
    return this.i18n.t('block10.public.genericError');
  }

  protected changeAnswer(): void {
    this.editing.set(true);
    this.formError.set('');
  }
}
