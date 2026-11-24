import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiCommunity, CommunitiesRepository } from '../../core/data/communities.repository';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { toApiError } from '../../core/api/api-error';
import { TranslationKey } from '../../core/i18n/translations';
import {
  BankDetails,
  CreateEventInput,
  EventType,
  GuestInput,
  HostEvent,
  TemplateId,
} from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { TemplatePreviewComponent } from '../../shared/components/template-preview.component';
import { DEFAULT_MANIFEST, TemplateManifest } from '../../core/models/template-manifest';
import { PhoneMaskDirective } from '../../shared/directives/phone-mask.directive';
import {
  EventVisibilityFieldsComponent,
  ageRangeError,
  parseAge,
} from '../../shared/components/event-visibility-fields.component';
import { EventVisibility } from '../../core/models/models';
import { extractYoutubeId } from '../../core/utils/youtube';
import { readPreferredLocation, writePreferredLocation, type PreferredLocation } from '../../core/utils/preferred-location';
import { MapPickerDialogComponent, MapPickResult, reverseGeocodeGoogle, roundCoord } from '../../shared/components/map-picker-dialog.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { EventDraftsRepository } from '../../core/data/event-drafts.repository';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const COVER_MAX_BYTES = 8 * 1024 * 1024;

interface WizardStep {
  id: number;
  labelKey: TranslationKey;
  icon: string;
}

@Component({
  selector: 'app-create-event-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FaIconComponent,
    TemplatePreviewComponent,
    PhoneMaskDirective,
    EventVisibilityFieldsComponent,
    MapPickerDialogComponent,
    ModalComponent,
  ],
  templateUrl: './create-event.page.html',
})
export class CreateEventPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly communitiesRepo = inject(CommunitiesRepository);

  /** Bloco 11: comunidades onde a conta é gestora ou responsável. */
  protected readonly communities = signal<ApiCommunity[]>([]);
  protected readonly communityId = signal<string>('');
  private readonly destroyRef = inject(DestroyRef);

  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  protected readonly step = signal(0);
  protected readonly publishing = signal(false);
  protected readonly formError = signal('');
  protected readonly created = signal<HostEvent | null>(null);
  protected readonly coverFile = signal<File | null>(null);
  private readonly coverObjectUrl = signal<string | null>(null);

  // Bloco 14 — localização exata e rascunhos
  protected readonly mapPickerOpen = signal(false);
  protected readonly pendingSaveLocation = signal<PreferredLocation | null>(null);
  protected readonly draftId = signal<string | null>(null);
  protected readonly draftSaving = signal(false);
  protected readonly draftSavedAt = signal<string | null>(null);
  protected readonly draftError = signal(false);
  private draftTimer: ReturnType<typeof setTimeout> | null = null;
  private draftSavingNow = false;
  private draftLoading = false;
  private readonly drafts = inject(EventDraftsRepository);

  protected readonly steps: WizardStep[] = [
    { id: 0, labelKey: 'create.step.event', icon: 'calendarPlus' },
    { id: 1, labelKey: 'create.step.invitation', icon: 'palette' },
    { id: 2, labelKey: 'create.step.guests', icon: 'guests' },
    { id: 3, labelKey: 'create.step.review', icon: 'checkDouble' },
  ];

  protected readonly types: EventType[] = ['wedding', 'birthday', 'corporate', 'baby', 'other'];

  protected readonly timezones = [
    { id: 'Africa/Luanda', labelKey: 'create.timezoneLuanda' as TranslationKey },
    { id: 'Europe/Lisbon', labelKey: 'create.timezoneLisbon' as TranslationKey },
    { id: 'Europe/London', labelKey: 'create.timezoneLondon' as TranslationKey },
    { id: 'UTC', labelKey: 'create.timezoneUtc' as TranslationKey },
  ];

  protected readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    type: this.fb.control<EventType>('wedding', Validators.required),
    hostName: [this.store.profile().name, [Validators.required, Validators.maxLength(120)]],
    hostEmail: [
      this.store.profile().email,
      [Validators.required, Validators.email, Validators.maxLength(160)],
    ],
    date: ['', Validators.required],
    time: ['18:00', Validators.required],
    endsAt: [''],
    timezone: ['Africa/Luanda', Validators.required],
    venue: ['', [Validators.maxLength(120)]],
    city: ['Luanda', [Validators.maxLength(80)]],
    onlineLink: [''],
    youtubeVideoUrl: [''],
    latitude: this.fb.control<number | null>(null),
    longitude: this.fb.control<number | null>(null),
    placeLabel: [''],
    useTables: [false],
    message: ['', [Validators.required, Validators.maxLength(1200)]],
    rules: ['', Validators.maxLength(800)],
    dressCode: ['', Validators.maxLength(160)],
    rsvpDeadline: [''],
    templateId: this.fb.control<TemplateId | null>(this.store.templates()[0]?.id ?? null),
    coverUrl: ['', [Validators.pattern(/^https:\/\/.+/), Validators.maxLength(2048)]],
    contributionEnabled: [false],
    bankName: [''],
    accountName: [''],
    iban: [''],
    visibilitySettings: this.fb.group({
      visibility: this.fb.control<EventVisibility>('private'),
      showAttendeeCount: [false],
      minAge: [''],
      maxAge: [''],
    }),
    guests: this.fb.array([this.guestGroup()]),
  });

  private readonly formChanges = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly formValue = computed(() => {
    this.formChanges();
    return this.form.getRawValue();
  });

  protected readonly typeLabel = computed(() => {
    const type = this.formValue().type;
    return this.i18n.t(`type.${type}` as TranslationKey);
  });

  protected readonly guestRows = computed(() =>
    this.form.controls.guests.controls
      .map((group) => group.getRawValue())
      .filter((value) => Boolean(value.name.trim() || value.email.trim() || value.phone.trim())),
  );

  protected readonly guestCount = computed(() => this.guestRows().length);

  protected readonly previewDate = computed(() => {
    const value = this.formValue();
    if (!value.date || !value.time) {
      return null;
    }
    const iso = this.zonedIso(value.date, value.time, value.timezone);
    if (!iso || Number.isNaN(new Date(iso).getTime())) {
      return null;
    }
    return {
      date: this.i18n.longDate(iso, value.timezone),
      time: this.i18n.time(iso, value.timezone),
    };
  });

  protected readonly previewDeadline = computed(() => {
    const value = this.formValue();
    if (!value.rsvpDeadline) {
      return null;
    }
    const iso = this.zonedIso(value.rsvpDeadline, '23:59', value.timezone);
    return iso ? this.i18n.shortDate(iso, value.timezone) : null;
  });

  protected readonly previewTitle = computed(
    () => this.formValue().title.trim() || this.i18n.t('create.preview.notConfigured'),
  );

  protected readonly coverPreview = computed(() => {
    const objectUrl = this.coverObjectUrl();
    if (objectUrl) {
      return objectUrl;
    }
    const url = this.formValue().coverUrl.trim();
    return /^https:\/\/.+/.test(url) ? url : null;
  });

  protected readonly contributionReady = computed(() => {
    if (!this.formValue().contributionEnabled) {
      return true;
    }
    return Boolean(
      this.formValue().bankName.trim() &&
      this.formValue().accountName.trim() &&
      this.formValue().iban.trim(),
    );
  });

  protected readonly canSubmit = computed(() => this.contributionReady() && this.guestCount() >= 0);

  constructor() {
    this.syncLocationValidators();
    void this.loadCommunities();
    this.store.load({ templates: true, profile: true });
    // Se os modelos chegarem depois de o formulário ser criado, aplica o
    // primeiro por omissão (o valor inicial pode ter sido `null`).
    effect(() => {
      const templates = this.store.templates();
      if (!this.form.controls.templateId.value && templates.length > 0) {
        this.form.controls.templateId.setValue(templates[0].id);
      }
    });
    const draftParam = this.route.snapshot.queryParamMap.get('draft');
    if (draftParam) {
      this.draftLoading = true;
      void this.loadDraft(draftParam).finally(() => {
        this.draftLoading = false;
      });
    }
    this.form.valueChanges.subscribe(() => {
      if (!this.draftLoading) this.scheduleDraftSave();
    });
    this.destroyRef.onDestroy(() => {
      this.revokeCoverObjectUrl();
      if (this.draftTimer) clearTimeout(this.draftTimer);
      if (this.draftId() && !this.created() && this.draftSavedAt()) {
        this.toasts.success(this.i18n.t('block14.drafts.saved'));
      }
    });
  }

  protected guestGroup() {
    return this.fb.group({
      name: ['', [Validators.maxLength(120)]],
      email: ['', [Validators.email, Validators.maxLength(160)]],
      phone: ['', [Validators.maxLength(40)]],
    });
  }

  protected addGuest(): void {
    this.form.controls.guests.push(this.guestGroup());
  }

  protected removeGuest(index: number): void {
    if (this.form.controls.guests.length <= 1) {
      this.form.controls.guests.at(0).reset({ name: '', email: '', phone: '' });
      return;
    }
    this.form.controls.guests.removeAt(index);
  }

  protected onCoverFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!COVER_TYPES.has(file.type)) {
      this.toasts.error(this.i18n.t('create.coverTypeInvalid'));
      return;
    }
    if (file.size > COVER_MAX_BYTES) {
      this.toasts.error(this.i18n.t('create.coverTooLarge'));
      return;
    }
    this.form.controls.coverUrl.setValue('');
    this.setCoverFile(file);
  }

  protected onCoverUrlInput(): void {
    if (this.form.controls.coverUrl.value.trim()) {
      this.setCoverFile(null);
    }
  }

  protected clearCover(): void {
    this.setCoverFile(null);
    this.form.controls.coverUrl.setValue('');
  }

  protected selectTemplate(id: TemplateId): void {
    this.form.controls.templateId.setValue(id);
    this.store.selectedTemplate.set(id);
  }

  protected manifestFor(id: TemplateId | null): TemplateManifest {
    return this.store.templates().find((template) => template.id === id)?.manifest ?? DEFAULT_MANIFEST;
  }

  protected templateName(id: TemplateId | null): string {
    return this.store.templates().find((template) => template.id === id)?.name ?? '—';
  }

  protected templateTag(id: TemplateId): string {
    return this.store.templates().find((template) => template.id === id)?.slug ?? '';
  }

  protected typeName(type: EventType): string {
    return this.i18n.t(`type.${type}` as TranslationKey);
  }

  protected eventStats(eventId: string) {
    return this.store.eventStats(eventId);
  }

  protected fieldError(name: keyof typeof this.form.controls): string {
    const control = this.form.controls[name] as AbstractControl;
    if (!control.touched || control.valid) {
      return '';
    }
    if (control.hasError('required')) {
      return this.i18n.t('create.errors.required');
    }
    if (control.hasError('email')) {
      return this.i18n.t('create.errors.email');
    }
    if (control.hasError('future')) {
      return this.i18n.t('create.errors.future');
    }
    if (control.hasError('afterStart')) {
      return this.i18n.t('create.errors.afterStart');
    }
    if (control.hasError('invalidLink')) {
      return this.i18n.t('create.errors.invalidLink');
    }
    if (control.hasError('pattern')) {
      return this.i18n.t('create.errors.invalidLink');
    }
    if (control.hasError('minlength')) {
      return this.i18n.t('create.errors.minLength', { min: 3 });
    }
    if (control.hasError('maxlength')) {
      return this.i18n.t('create.errors.maxLength', { max: 160 });
    }
    return this.i18n.t('create.errors.required');
  }

  protected guestError(index: number, field: 'name' | 'email'): string {
    const group = this.form.controls.guests.at(index);
    const control = group.controls[field];
    if (!control.touched) {
      return '';
    }
    if (field === 'name' && !control.value.trim()) {
      return this.i18n.t('create.errors.guestName');
    }
    if (field === 'email' && control.value) {
      const hostEmail = this.form.controls.hostEmail.value.trim().toLowerCase();
      if (control.value.trim().toLowerCase() === hostEmail) {
        return this.i18n.t('create.errors.hostEmailGuest');
      }
      if (control.invalid) {
        return this.i18n.t('create.errors.email');
      }
    }
    return '';
  }

  protected setStep(step: number): void {
    if (step < 0 || step > 3) {
      return;
    }
    this.step.set(step);
    this.formError.set('');
  }

  protected next(): void {
    if (!this.validateStep(this.step())) {
      this.formError.set(this.i18n.t('create.errorStep'));
      this.toasts.error(this.i18n.t('create.errorStep'));
      return;
    }
    this.formError.set('');
    this.step.update((current) => Math.min(3, current + 1));
    void this.saveDraft();
  }

  protected previous(): void {
    this.formError.set('');
    this.step.update((current) => Math.max(0, current - 1));
  }

  protected async publish(): Promise<void> {
    if (!this.validateAll()) {
      this.formError.set(this.i18n.t('create.errorStep'));
      this.toasts.error(this.i18n.t('create.errorStep'));
      return;
    }
    this.formError.set('');
    this.publishing.set(true);
    try {
      const event = await this.store.createEvent(this.buildInput());
      const cover = this.coverFile();
      if (cover) {
        try {
          await this.store.uploadEventCover(event.id, cover).promise;
        } catch {
          this.toasts.error(this.i18n.t('create.coverUploadFailed'));
        }
        this.setCoverFile(null);
      }
      const draftId = this.draftId();
      if (draftId) {
        this.draftId.set(null);
        void this.drafts.remove(draftId).catch(() => undefined);
      }
      this.created.set(this.store.eventById(event.id) ?? event);
    } catch (error: unknown) {
      this.formError.set(toApiError(error).message);
    } finally {
      this.publishing.set(false);
    }
  }

  protected viewCreated(): void {
    const event = this.created();
    if (!event) {
      return;
    }
    void this.router.navigate(['/eventos', event.id]);
  }

  protected createAnother(): void {
    this.created.set(null);
    this.setCoverFile(null);
    this.step.set(0);
    this.formError.set('');
    this.form.reset({
      title: '',
      type: 'wedding',
      hostName: this.store.profile().name,
      hostEmail: this.store.profile().email,
      date: '',
      time: '18:00',
      timezone: 'Africa/Luanda',
      venue: '',
      city: 'Luanda',
      onlineLink: '',
      message: '',
      rules: '',
      dressCode: '',
      rsvpDeadline: '',
      templateId: this.store.templates()[0]?.id ?? null,
      coverUrl: '',
      contributionEnabled: false,
      bankName: '',
      accountName: '',
      iban: '',
      visibilitySettings: {
        visibility: 'private',
        showAttendeeCount: false,
        minAge: '',
        maxAge: '',
      },
    });
    this.form.controls.guests.clear();
    this.form.controls.guests.push(this.guestGroup());
  }

  /** Pré-seleciona `?comunidade=` (vindo da página da comunidade). */
  private async loadCommunities(): Promise<void> {
    try {
      const mine = await this.communitiesRepo.list('mine');
      const eligible = mine.filter(
        (item) => item.my_status === 'active' && (item.my_role === 'owner' || item.my_role === 'manager'),
      );
      this.communities.set(eligible);
      const requested = this.route.snapshot.queryParamMap.get('comunidade');
      if (requested && eligible.some((item) => item.id === requested)) {
        this.communityId.set(requested);
      }
    } catch {
      this.communities.set([]);
    }
  }

  private validateAll(): boolean {
    return this.validateStep(0) && this.validateStep(1) && this.validateStep(2);
  }

  private validateStep(step: number): boolean {
    if (step === 0) {
      const controls = [
        this.form.controls.title,
        this.form.controls.hostName,
        this.form.controls.hostEmail,
        this.form.controls.date,
        this.form.controls.time,
        this.form.controls.venue,
        this.form.controls.city,
        this.form.controls.coverUrl,
      ];
      controls.forEach((control) => control.markAsTouched());
      if (controls.some((control) => control.invalid)) {
        return false;
      }
      const iso = this.zonedIso(
        this.form.controls.date.value,
        this.form.controls.time.value,
        this.form.controls.timezone.value,
      );
      if (!iso || new Date(iso).getTime() <= Date.now()) {
        this.form.controls.date.setErrors({ future: true });
        return false;
      }
      this.form.controls.date.updateValueAndValidity({ onlySelf: true });
      const endsAt = this.endsAtIso();
      if (endsAt && new Date(endsAt).getTime() <= new Date(iso).getTime()) {
        this.form.controls.endsAt.setErrors({ afterStart: true });
        return false;
      }
      this.form.controls.endsAt.updateValueAndValidity({ onlySelf: true });
      const link = this.form.controls.onlineLink.value.trim();
      if (link && !link.startsWith('https://')) {
        this.form.controls.onlineLink.setErrors({ invalidLink: true });
        return false;
      }
      return true;
    }

    if (step === 1) {
      this.form.controls.message.markAsTouched();
      this.form.controls.youtubeVideoUrl.markAsTouched();
      if (this.form.controls.message.invalid) {
        return false;
      }
      if (this.youtubeUrlError()) {
        return false;
      }
      if (this.form.controls.contributionEnabled.value && !this.contributionReady()) {
        return false;
      }
      const ages = this.form.controls.visibilitySettings.getRawValue();
      if (ageRangeError(ages.minAge, ages.maxAge)) {
        return false;
      }
      return true;
    }

    if (step === 2) {
      const groups = this.form.controls.guests.controls;
      const hostEmail = this.form.controls.hostEmail.value.trim().toLowerCase();
      const seen = new Set<string>();
      let valid = true;
      groups.forEach((group) => {
        group.markAllAsTouched();
        const value = group.getRawValue();
        const hasAny = value.name.trim() || value.email.trim() || value.phone.trim();
        if (!hasAny) {
          return;
        }
        if (value.name.trim().length < 2) {
          valid = false;
        }
        if (!EMAIL_PATTERN.test(value.email.trim())) {
          valid = false;
        }
        const normalized = value.email.trim().toLowerCase();
        if (normalized === hostEmail) {
          valid = false;
        }
        if (seen.has(normalized)) {
          valid = false;
        }
        seen.add(normalized);
      });
      return valid;
    }

    return true;
  }

  protected youtubeUrlError(): string {
    const raw = this.form.controls.youtubeVideoUrl.value.trim();
    if (!raw) return '';
    return extractYoutubeId(raw) ? '' : this.i18n.t('block14.video.invalid');
  }

  protected resolvedYoutubeId(): string | null {
    return extractYoutubeId(this.form.controls.youtubeVideoUrl.value);
  }

  protected hasExactLocation(): boolean {
    const v = this.form.getRawValue();
    return typeof v.latitude === 'number' && typeof v.longitude === 'number';
  }

  private syncLocationValidators(): void {
    const hasExact = this.hasExactLocation();
    const venue = this.form.controls.venue;
    const city = this.form.controls.city;
    const venueValidators = [Validators.maxLength(120), ...(hasExact ? [] : [Validators.required])];
    const cityValidators = [Validators.maxLength(80), ...(hasExact ? [] : [Validators.required])];
    venue.setValidators(venueValidators);
    city.setValidators(cityValidators);
    venue.updateValueAndValidity({ emitEvent: false });
    city.updateValueAndValidity({ emitEvent: false });
  }

  private promptSaveLocation(lat: number, lng: number, city?: string, venue?: string): void {
    const saved = readPreferredLocation();
    if (saved && saved.latitude === lat && saved.longitude === lng) return;
    this.pendingSaveLocation.set({
      latitude: lat,
      longitude: lng,
      city: city ?? (this.form.controls.city.value.trim() || undefined),
      venue: venue ?? (this.form.controls.venue.value.trim() || undefined),
      placeLabel: this.form.controls.placeLabel.value.trim() || undefined,
    });
  }

  protected savePreferredLocation(): void {
    const pending = this.pendingSaveLocation();
    if (pending) writePreferredLocation(pending);
    this.pendingSaveLocation.set(null);
  }

  protected dismissPreferredLocation(): void {
    this.pendingSaveLocation.set(null);
  }

  protected openMapPicker(): void {
    this.mapPickerOpen.set(true);
  }

  protected closeMapPicker(): void {
    this.mapPickerOpen.set(false);
  }

  protected onMapPicked(point: MapPickResult): void {
    this.form.controls.latitude.setValue(point.latitude);
    this.form.controls.longitude.setValue(point.longitude);
    this.form.controls.latitude.markAsDirty();
    this.form.controls.longitude.markAsDirty();
    if (point.city) this.form.controls.city.setValue(point.city);
    if (point.venue) this.form.controls.venue.setValue(point.venue);
    this.syncLocationValidators();
    this.closeMapPicker();
    this.scheduleDraftSave();
    this.promptSaveLocation(point.latitude, point.longitude, point.city, point.venue);
  }

  protected removeExactLocation(): void {
    this.form.controls.latitude.setValue(null);
    this.form.controls.longitude.setValue(null);
    this.form.controls.placeLabel.setValue('');
    this.syncLocationValidators();
    this.scheduleDraftSave();
  }

  protected useMyLocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.toasts.error(this.i18n.t('block14.location.error'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = roundCoord(pos.coords.latitude);
        const lng = roundCoord(pos.coords.longitude);
        this.form.controls.latitude.setValue(lat);
        this.form.controls.longitude.setValue(lng);
        this.syncLocationValidators();
        this.scheduleDraftSave();
        this.promptSaveLocation(lat, lng);
        void reverseGeocodeGoogle(lat, lng).then((address) => {
          if (address.city) this.form.controls.city.setValue(address.city);
          if (address.venue) this.form.controls.venue.setValue(address.venue);
          if (address.city || address.venue) this.scheduleDraftSave();
          const pending = this.pendingSaveLocation();
          if (pending && pending.latitude === lat && pending.longitude === lng) {
            this.pendingSaveLocation.set({
              ...pending,
              city: address.city ?? pending.city,
              venue: address.venue ?? pending.venue,
            });
          }
        });
      },
      () => this.toasts.error(this.i18n.t('block14.location.error')),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  private scheduleDraftSave(): void {
    if (this.created()) return;
    if (this.draftTimer) clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => void this.saveDraft(), 2000);
  }

  private async saveDraft(): Promise<void> {
    if (this.created() || this.draftSavingNow) return;
    this.draftSavingNow = true;
    this.draftSaving.set(true);
    this.draftError.set(false);
    try {
      const payload = this.buildDraftPayload();
      const title = this.form.controls.title.value.trim() || null;
      const id = this.draftId();
      const saved = id
        ? await this.drafts.update(id, { title, step: this.step(), payload })
        : await this.drafts.create({ title, step: this.step(), payload });
      this.draftId.set(saved.id);
      this.draftSavedAt.set(saved.updatedAt);
    } catch {
      this.draftError.set(true);
    } finally {
      this.draftSavingNow = false;
      this.draftSaving.set(false);
    }
  }

  private buildDraftPayload(): Record<string, unknown> {
    const raw = this.form.getRawValue();
    // Não guardar ficheiro de capa local no rascunho (só URL).
    return { ...raw, coverFile: null };
  }

  private async loadDraft(id: string): Promise<void> {
    try {
      const draft = await this.drafts.get(id);
      const payload = (draft.payload ?? {}) as Record<string, unknown>;
      this.form.patchValue(this.sanitizeDraftPayload(payload), { emitEvent: false });
      const step = typeof draft.step === 'number' ? Math.max(0, Math.min(3, draft.step)) : 0;
      this.step.set(step);
      this.syncLocationValidators();
      this.draftId.set(draft.id);
      this.draftSavedAt.set(draft.updatedAt);
    } catch {
      this.toasts.error(this.i18n.t('block14.drafts.saveError'));
    }
  }

  private sanitizeDraftPayload(payload: Record<string, unknown>): Record<string, unknown> {
    // Only allow known keys; avoid injecting unexpected shapes.
    const allowed = new Set([
      'title','type','hostName','hostEmail','date','time','endsAt','timezone','venue','city','onlineLink',
      'youtubeVideoUrl','latitude','longitude','placeLabel','useTables','message','rules','dressCode',
      'rsvpDeadline','templateId','coverUrl','contributionEnabled','bankName','accountName','iban',
      'visibilitySettings','guests',
    ]);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (allowed.has(k)) out[k] = v;
    }
    return out;
  }

  private buildInput(): CreateEventInput {
    const value = this.form.getRawValue();
    const guests: GuestInput[] = value.guests
      .filter((guest) => guest.name.trim() || guest.email.trim() || guest.phone.trim())
      .map((guest) => ({
        name: guest.name.trim(),
        email: guest.email.trim(),
        phone: guest.phone.trim() || null,
      }));

    const bankDetails: BankDetails | null = value.contributionEnabled
      ? {
          bankName: value.bankName.trim(),
          accountHolder: value.accountName.trim(),
          accountReference: value.iban.trim(),
        }
      : null;

    const online = value.onlineLink.trim() || null;
    const youtubeVideoId = this.resolvedYoutubeId();
    return {
      title: value.title.trim(),
      type: value.type,
      hostName: value.hostName.trim(),
      hostEmail: value.hostEmail.trim(),
      startsAt: this.zonedIso(value.date, value.time, value.timezone),
      endsAt: this.endsAtIso(),
      timezone: value.timezone,
      venue: value.venue.trim(),
      city: value.city.trim(),
      onlineLink: online,
      message: value.message.trim(),
      rules: value.rules.trim(),
      dressCode: value.dressCode.trim(),
      rsvpDeadline: value.rsvpDeadline
        ? this.zonedIso(value.rsvpDeadline, '23:59', value.timezone)
        : null,
      templateId: value.templateId,
      coverUrl: this.coverFile() ? null : value.coverUrl.trim() || null,
      contributionEnabled: value.contributionEnabled,
      bankDetails,
      guests,
      visibility: value.visibilitySettings.visibility,
      showAttendeeCount:
        value.visibilitySettings.visibility === 'public' &&
        value.visibilitySettings.showAttendeeCount,
      minAge: parseAge(value.visibilitySettings.minAge),
      maxAge: parseAge(value.visibilitySettings.maxAge),
      communityId: this.communityId() || null,
      youtubeVideoId,
      latitude: online ? null : value.latitude,
      longitude: online ? null : value.longitude,
      placeLabel: online ? null : (value.placeLabel.trim() || null),
      useTables: value.useTables,
    };
  }

  private setCoverFile(file: File | null): void {
    this.revokeCoverObjectUrl();
    if (!file) {
      this.coverFile.set(null);
      return;
    }
    this.coverFile.set(file);
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      this.coverObjectUrl.set(URL.createObjectURL(file));
    }
  }

  private revokeCoverObjectUrl(): void {
    const objectUrl = this.coverObjectUrl();
    if (objectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(objectUrl);
    }
    this.coverObjectUrl.set(null);
  }

  /** Converte o campo opcional `datetime-local` para ISO no fuso do evento. */
  private endsAtIso(): string | null {
    const value = this.form.controls.endsAt.value.trim();
    if (!value || value.length < 16) {
      return null;
    }
    return this.zonedIso(value.slice(0, 10), value.slice(11, 16), this.form.controls.timezone.value);
  }

  private zonedIso(dateValue: string, timeValue: string, timezone: string): string {
    if (!dateValue || !timeValue) {
      return '';
    }
    const [year, month, day] = dateValue.split('-').map(Number);
    const [hour, minute] = timeValue.split(':').map(Number);
    const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
    if (Number.isNaN(naive)) {
      return '';
    }
    const offset = this.offsetMinutes(new Date(naive), timezone);
    return new Date(naive - offset * 60_000).toISOString();
  }

  private offsetMinutes(date: Date, timeZone: string): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts: Record<string, string> = {};
    for (const part of formatter.formatToParts(date)) {
      if (part.type !== 'literal') {
        parts[part.type] = part.value;
      }
    }
    const asUtc = Date.UTC(
      Number(parts['year']),
      Number(parts['month']) - 1,
      Number(parts['day']),
      Number(parts['hour']),
      Number(parts['minute']),
      Number(parts['second']),
    );
    return Math.round((asUtc - date.getTime()) / 60_000);
  }
}
