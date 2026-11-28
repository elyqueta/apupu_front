import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { GeocodeResult, GeocodeService } from '../../core/services/geocode.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/translations';
import type { EventLocationEntry } from '../../core/models/models';
import { ICONS } from '../../core/ui/icons';
import { hasExactLocation, isoToTime, locationError, timeToIso } from '../../core/utils/event-locations';
import {
  readPreferredLocation,
  writePreferredLocation,
  type PreferredLocation,
} from '../../core/utils/preferred-location';
import { ToastService } from '../../core/services/toast.service';
import { LocationPickerDialogComponent, LocationPickResult } from './location-picker-dialog.component';
import { ModalComponent } from './modal.component';

const round = (value: number): number => Math.round(value * 1e6) / 1e6;

/** Bloco 16 — formulário de um local (presencial ou online) do anfitrião. */
@Component({
  selector: 'app-location-edit-dialog',
  imports: [ModalComponent, ReactiveFormsModule, FaIconComponent, LocationPickerDialogComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('block16.locations.edit')"
      presentation="dialog"
      size="lg"
      (closed)="closed.emit()"
    >
      <form id="app-location-edit-form" class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="save()">
        <div class="flex gap-2" role="group" [attr.aria-label]="i18n.t('block16.locations.title')">
          <button
            type="button"
            class="min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold transition"
            [class]="form.controls.kind.value === 'venue' ? 'border-brand bg-brand/10 text-brand-strong' : 'border-line bg-surface-raised text-muted'"
            [attr.aria-pressed]="form.controls.kind.value === 'venue'"
            (click)="setKind('venue')"
          >
            {{ i18n.t('block16.locations.venue') }}
          </button>
          <button
            type="button"
            class="min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold transition"
            [class]="form.controls.kind.value === 'online' ? 'border-brand bg-brand/10 text-brand-strong' : 'border-line bg-surface-raised text-muted'"
            [attr.aria-pressed]="form.controls.kind.value === 'online'"
            (click)="setKind('online')"
          >
            {{ i18n.t('block16.locations.online') }}
          </button>
        </div>

        @if (form.controls.kind.value === 'online') {
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block16.locations.onlineUrl') }} *</span>
            <input
              id="location-online-url"
              type="url"
              formControlName="onlineUrl"
              [placeholder]="'https://'"
              data-testid="location-online-url"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50"
            />
          </label>
        } @else {
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block16.locations.address') }} *</span>
            <input
              id="location-address"
              type="search"
              formControlName="address"
              [placeholder]="i18n.t('block16.locations.searchHint')"
              data-testid="location-address"
              autocomplete="off"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50"
            />
          </label>
          @if (searching()) {
            <p class="text-xs text-muted" aria-live="polite">{{ i18n.t('block16.locations.searching') }}</p>
          }
          @if (searchError()) {
            <p class="text-xs text-coral" aria-live="polite">{{ i18n.t('block16.locations.searchError') }}</p>
          }
          @if (results().length) {
            <ul class="max-h-40 overflow-auto rounded-xl border border-line bg-surface-raised" data-testid="location-suggestions">
              @for (result of results(); track result.displayName + result.latitude) {
                <li>
                  <button type="button" class="flex min-h-11 w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface" (click)="selectResult(result)">
                    {{ result.displayName }}
                  </button>
                </li>
              }
            </ul>
          }

          <div class="flex flex-wrap gap-2">
            <button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-xs font-semibold text-ink transition hover:border-brand/40" (click)="useMyLocation()">
              <fa-icon [icon]="icons['crosshairs']" aria-hidden="true" />
              {{ i18n.t('block16.locations.useMyLocation') }}
            </button>
            <button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-xs font-semibold text-ink transition hover:border-brand/40" (click)="mapOpen.set(true)">
              <fa-icon [icon]="icons['mapPin']" aria-hidden="true" />
              {{ i18n.t('block16.locations.pickOnMap') }}
            </button>
            @if (exact()) {
              <button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-coral/30 bg-coral/10 px-3 text-xs font-semibold text-coral transition" (click)="removePoint()">
                <fa-icon [icon]="icons['xmark']" aria-hidden="true" />
                {{ i18n.t('block16.locations.removePoint') }}
              </button>
            }
          </div>
          @if (exact()) {
            <p class="text-xs font-semibold text-mint" data-testid="location-point">
              <fa-icon [icon]="icons['check']" class="mr-1" aria-hidden="true" />
              {{ i18n.t('block14.location.set', { lat: form.controls.latitude.value!.toFixed(6), lng: form.controls.longitude.value!.toFixed(6) }) }}
            </p>
          }

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block16.locations.venueName') }} <span class="text-muted/60">({{ i18n.t('common.optional') }})</span></span>
              <input type="text" formControlName="venueName" maxlength="120" data-testid="location-venue-name" class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block16.locations.city') }} <span class="text-muted/60">({{ i18n.t('common.optional') }})</span></span>
              <input type="text" formControlName="city" maxlength="120" class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50" />
            </label>
          </div>
        }

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block16.locations.label') }} <span class="text-muted/60">({{ i18n.t('common.optional') }})</span></span>
            <input type="text" formControlName="label" maxlength="40" data-testid="location-label" class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block16.locations.time') }} <span class="text-muted/60">({{ i18n.t('common.optional') }})</span></span>
            <input type="time" formControlName="time" data-testid="location-time" class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50" />
          </label>
        </div>

        <label class="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface-raised/40 px-3 py-2">
          <input type="checkbox" formControlName="primary" data-testid="location-primary" class="size-4 accent-brand" />
          <span class="text-sm text-ink">{{ i18n.t('block16.locations.setPrimary') }}</span>
        </label>

        @if (errorKey()) {
          <p class="text-xs font-semibold text-coral" role="alert" data-testid="location-error">{{ i18n.t(errorKey()!) }}</p>
        }
      </form>

      <div modal-footer class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" class="ui-btn-secondary" (click)="closed.emit()">{{ i18n.t('common.cancel') }}</button>
        <button type="submit" form="app-location-edit-form" class="ui-btn" data-testid="location-save">{{ i18n.t('block16.locations.save') }}</button>
      </div>

      <app-location-picker-dialog
        [open]="mapOpen()"
        [initial]="exact() ? { latitude: form.controls.latitude.value!, longitude: form.controls.longitude.value!, placeName: placeName() } : null"
        (picked)="onMapPicked($event)"
        (closed)="mapOpen.set(false)"
      />

      <app-modal
        [open]="!!pendingSave()"
        [title]="i18n.t('block14.location.saveTitle')"
        size="sm"
        (closed)="pendingSave.set(null)"
      >
        <p class="text-sm leading-6 text-muted">{{ i18n.t('block14.location.saveBody') }}</p>
        <div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end" modal-footer>
          <button type="button" class="ui-btn-secondary" (click)="pendingSave.set(null)">{{ i18n.t('block14.location.saveDismiss') }}</button>
          <button type="button" class="ui-btn" (click)="savePreferred()">{{ i18n.t('block14.location.saveConfirm') }}</button>
        </div>
      </app-modal>
    </app-modal>
  `,
})
export class LocationEditDialogComponent {
  readonly open = input(false);
  readonly location = input<EventLocationEntry | null>(null);
  readonly primary = input(false);
  readonly date = input('');
  readonly timezone = input('Africa/Luanda');

  readonly saved = output<EventLocationEntry>();
  readonly closed = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly geocode = inject(GeocodeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toasts = inject(ToastService);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  protected readonly form = this.fb.group({
    kind: this.fb.control<'venue' | 'online'>('venue'),
    address: ['', [Validators.maxLength(240)]],
    venueName: ['', [Validators.maxLength(120)]],
    label: ['', [Validators.maxLength(40)]],
    time: [''],
    city: ['', [Validators.maxLength(120)]],
    onlineUrl: [''],
    latitude: this.fb.control<number | null>(null),
    longitude: this.fb.control<number | null>(null),
    primary: [false],
  });

  protected readonly results = signal<GeocodeResult[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchError = signal(false);
  protected readonly mapOpen = signal(false);
  protected readonly pendingSave = signal<PreferredLocation | null>(null);
  protected readonly errorKey = signal<TranslationKey | ''>('');
  protected readonly placeName = signal<string | null>(null);

  protected readonly exact = () => this.form.controls.latitude.value != null && this.form.controls.longitude.value != null;

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const location = this.location();
      this.form.reset({
        kind: location?.kind ?? 'venue',
        address: location?.kind === 'venue' ? (location.address ?? '') : '',
        venueName: location?.venueName ?? '',
        label: location?.label ?? '',
        time: isoToTime(location?.startsAt, this.timezone()),
        city: location?.city ?? '',
        onlineUrl: location?.onlineUrl ?? '',
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        primary: location ? location.isPrimary : this.primary(),
      });
      this.placeName.set(location?.venueName ?? null);
      this.results.set([]);
      this.searchError.set(false);
      this.errorKey.set('');
      this.mapOpen.set(false);
      this.pendingSave.set(null);
    });

    this.form.controls.address.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => void this.search(value));
  }

  protected setKind(kind: 'venue' | 'online'): void {
    this.form.controls.kind.setValue(kind);
    this.errorKey.set('');
  }

  private async search(value: string): Promise<void> {
    if (this.form.controls.kind.value !== 'venue') return;
    const term = value.trim();
    if (term.length < 3) {
      this.results.set([]);
      this.searchError.set(false);
      return;
    }
    this.searching.set(true);
    this.searchError.set(false);
    try {
      const found = await this.geocode.search(term);
      if (this.form.controls.address.value.trim() === term) this.results.set(found);
    } catch {
      if (this.form.controls.address.value.trim() === term) {
        this.searchError.set(true);
        this.results.set([]);
      }
    } finally {
      if (this.form.controls.address.value.trim() === term) this.searching.set(false);
    }
  }

  protected selectResult(result: GeocodeResult): void {
    if (!this.form.controls.address.value.trim()) {
      this.form.controls.address.setValue(result.displayName);
    }
    this.form.controls.latitude.setValue(round(result.latitude));
    this.form.controls.longitude.setValue(round(result.longitude));
    this.placeName.set(result.displayName);
    this.results.set([]);
  }

  protected useMyLocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.toasts.error(this.i18n.t('block16.locations.locationDenied'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = round(position.coords.latitude);
        const longitude = round(position.coords.longitude);
        this.form.controls.latitude.setValue(latitude);
        this.form.controls.longitude.setValue(longitude);
        this.setPoint({ latitude, longitude, placeName: null });
      },
      () => this.toasts.error(this.i18n.t('block16.locations.locationDenied')),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  protected onMapPicked(point: LocationPickResult): void {
    this.form.controls.latitude.setValue(point.latitude);
    this.form.controls.longitude.setValue(point.longitude);
    this.setPoint(point);
    this.mapOpen.set(false);
  }

  private setPoint(point: LocationPickResult): void {
    if (point.placeName) this.placeName.set(point.placeName);
    if (!this.form.controls.address.value.trim() && point.placeName) {
      this.form.controls.address.setValue(point.placeName);
    }
    this.promptSave(point);
  }

  private promptSave(point: LocationPickResult): void {
    const saved = readPreferredLocation();
    if (saved && saved.latitude === point.latitude && saved.longitude === point.longitude) return;
    this.pendingSave.set({
      latitude: point.latitude,
      longitude: point.longitude,
      city: this.form.controls.city.value.trim() || undefined,
      venue: this.form.controls.venueName.value.trim() || undefined,
      placeLabel: this.form.controls.label.value.trim() || undefined,
    });
  }

  protected savePreferred(): void {
    const pending = this.pendingSave();
    if (pending) writePreferredLocation(pending);
    this.pendingSave.set(null);
  }

  protected removePoint(): void {
    this.form.controls.latitude.setValue(null);
    this.form.controls.longitude.setValue(null);
    this.placeName.set(null);
  }

  protected save(): void {
    const value = this.form.getRawValue();
    const entry: EventLocationEntry = {
      id: this.location()?.id ?? null,
      isPrimary: value.primary,
      kind: value.kind,
      address: value.kind === 'venue' ? value.address.trim() || null : null,
      venueName: value.kind === 'venue' ? value.venueName.trim() || null : null,
      label: value.label.trim() || null,
      startsAt: value.kind === 'venue' ? timeToIso(value.time, this.date(), this.timezone()) : null,
      city: value.kind === 'venue' ? value.city.trim() || null : null,
      latitude: value.kind === 'venue' ? value.latitude : null,
      longitude: value.kind === 'venue' ? value.longitude : null,
      onlineUrl: value.kind === 'online' ? value.onlineUrl.trim() || null : null,
    };
    const error = locationError(entry);
    if (error) {
      this.errorKey.set(error);
      return;
    }
    this.saved.emit(entry);
  }
}
