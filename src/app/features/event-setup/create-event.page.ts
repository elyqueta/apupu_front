import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
import { TemplateArtworkComponent } from '../../shared/components/template-artwork.component';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface WizardStep {
  id: number;
  labelKey: TranslationKey;
  icon: string;
}

@Component({
  selector: 'app-create-event-page',
  imports: [RouterLink, ReactiveFormsModule, FaIconComponent, TemplateArtworkComponent],
  templateUrl: './create-event.page.html',
})
export class CreateEventPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  protected readonly step = signal(0);
  protected readonly publishing = signal(false);
  protected readonly formError = signal('');
  protected readonly created = signal<HostEvent | null>(null);

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
    timezone: ['Africa/Luanda', Validators.required],
    venue: ['', [Validators.required, Validators.maxLength(120)]],
    city: ['Luanda', [Validators.required, Validators.maxLength(80)]],
    onlineLink: [''],
    message: ['', [Validators.required, Validators.maxLength(1200)]],
    rules: ['', Validators.maxLength(800)],
    dressCode: ['', Validators.maxLength(160)],
    rsvpDeadline: [''],
    templateId: this.fb.control<TemplateId | null>(this.store.templates()[0]?.id ?? null),
    contributionEnabled: [false],
    bankName: [''],
    accountName: [''],
    iban: [''],
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
    this.store.load({ templates: true, profile: true });
    // Se os modelos chegarem depois de o formulário ser criado, aplica o
    // primeiro por omissão (o valor inicial pode ter sido `null`).
    effect(() => {
      const templates = this.store.templates();
      if (!this.form.controls.templateId.value && templates.length > 0) {
        this.form.controls.templateId.setValue(templates[0].id);
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

  protected selectTemplate(id: TemplateId): void {
    this.form.controls.templateId.setValue(id);
    this.store.selectedTemplate.set(id);
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
    if (control.hasError('invalidLink')) {
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
    if (field === 'email' && control.value && control.invalid) {
      return this.i18n.t('create.errors.email');
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
      this.created.set(event);
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
      contributionEnabled: false,
      bankName: '',
      accountName: '',
      iban: '',
    });
    this.form.controls.guests.clear();
    this.form.controls.guests.push(this.guestGroup());
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
      const link = this.form.controls.onlineLink.value.trim();
      if (link && !link.startsWith('https://')) {
        this.form.controls.onlineLink.setErrors({ invalidLink: true });
        return false;
      }
      return true;
    }

    if (step === 1) {
      this.form.controls.message.markAsTouched();
      if (this.form.controls.message.invalid) {
        return false;
      }
      if (this.form.controls.contributionEnabled.value && !this.contributionReady()) {
        return false;
      }
      return true;
    }

    if (step === 2) {
      const groups = this.form.controls.guests.controls;
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
        if (seen.has(normalized)) {
          valid = false;
        }
        seen.add(normalized);
      });
      return valid;
    }

    return true;
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

    return {
      title: value.title.trim(),
      type: value.type,
      hostName: value.hostName.trim(),
      hostEmail: value.hostEmail.trim(),
      startsAt: this.zonedIso(value.date, value.time, value.timezone),
      timezone: value.timezone,
      venue: value.venue.trim(),
      city: value.city.trim(),
      onlineLink: value.onlineLink.trim() || null,
      message: value.message.trim(),
      rules: value.rules.trim(),
      dressCode: value.dressCode.trim(),
      rsvpDeadline: value.rsvpDeadline
        ? this.zonedIso(value.rsvpDeadline, '23:59', value.timezone)
        : null,
      templateId: value.templateId,
      contributionEnabled: value.contributionEnabled,
      bankDetails,
      guests,
    };
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
