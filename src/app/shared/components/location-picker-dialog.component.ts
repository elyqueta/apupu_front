import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { GeocodeResult, GeocodeService } from '../../core/services/geocode.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { ModalComponent } from './modal.component';
import { LocationMapComponent, LocationPoint } from './location-map.component';

export interface LocationPickResult extends LocationPoint {
  placeName: string | null;
}

interface LocationDraft {
  latitude: number | null;
  longitude: number | null;
  placeName: string | null;
}

const EMPTY_DRAFT: LocationDraft = { latitude: null, longitude: null, placeName: null };

@Component({
  selector: 'app-location-picker-dialog',
  standalone: true,
  imports: [ModalComponent, ReactiveFormsModule, FaIconComponent, LocationMapComponent, DecimalPipe],
  template: `
    <app-modal [open]="open()" [title]="i18n.t('block16.locations.pickerTitle')" size="full" (closed)="closed.emit()">
      <div class="flex h-full min-h-0 flex-col gap-3">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-muted">{{ i18n.t('block16.locations.searchPlace') }}</span>
          <div class="relative">
            <input
              [formControl]="query"
              type="search"
              [placeholder]="i18n.t('block16.locations.searchPlaceholder')"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 pr-10 text-sm text-ink outline-none focus:border-brand/50"
              autocomplete="off"
            />
            <fa-icon [icon]="icons['search']" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          </div>
        </label>

        @if (searching()) {
          <p class="text-xs text-muted" aria-live="polite">{{ i18n.t('block16.locations.searching') }}</p>
        }
        @if (searchError()) {
          <p class="text-xs text-coral" aria-live="polite" role="alert">{{ i18n.t('block16.locations.searchError') }}</p>
        }
        @if (results().length > 0) {
          <ul class="max-h-40 overflow-auto rounded-xl border border-line bg-surface-raised">
            @for (r of results(); track r.latitude + ',' + r.longitude + r.displayName) {
              <li>
                <button type="button" class="flex w-full min-h-11 items-start px-3 py-2 text-left text-sm text-ink hover:bg-surface" (click)="selectResult(r)">
                  <span class="line-clamp-2">{{ r.displayName }}</span>
                </button>
              </li>
            }
          </ul>
        } @else if (query.value.trim().length >= 3 && !searching() && searched()) {
          <p class="text-xs text-muted" aria-live="polite">{{ i18n.t('block16.locations.searchEmpty') }}</p>
        }

        <div class="min-h-0 flex-1">
          <app-location-map
            [latitude]="draft().latitude"
            [longitude]="draft().longitude"
            [placeName]="draft().placeName"
            [interactive]="true"
            [tapToActivate]="false"
            [ariaLabel]="i18n.t('block16.locations.mapAria')"
            (pointChange)="onPointChange($event)"
          />
        </div>

        <div class="rounded-xl border border-line bg-surface-raised/50 px-3 py-2 text-xs text-muted">
          @if (draft().latitude !== null && draft().longitude !== null) {
            <div><span class="font-semibold text-ink">{{ i18n.t('block16.locations.coordinates') }}</span> {{ draft().latitude | number:'1.6-6' }}, {{ draft().longitude | number:'1.6-6' }}</div>
            @if (draft().placeName) { <div class="mt-1"><span class="font-semibold text-ink">{{ i18n.t('block16.locations.place') }}</span> {{ draft().placeName }}</div> }
          } @else {
            {{ i18n.t('block16.locations.mapHint') }}
          }
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
          <button type="button" class="ui-btn-muted" (click)="clear()">{{ i18n.t('block16.locations.clear') }}</button>
          <button type="button" class="ui-btn-muted" (click)="closed.emit()">{{ i18n.t('common.cancel') }}</button>
          <button type="button" class="ui-btn-primary" [disabled]="draft().latitude === null || draft().longitude === null" data-testid="location-picker-confirm" (click)="confirm()">{{ i18n.t('block16.locations.confirmPoint') }}</button>
        </div>
      </div>
    </app-modal>
  `,
})
export class LocationPickerDialogComponent {
  readonly open = input(false);
  readonly initial = input<LocationPickResult | null>(null);
  readonly picked = output<LocationPickResult>();
  readonly closed = output<void>();

  private readonly geocode = inject(GeocodeService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  protected readonly query = new FormControl('', { nonNullable: true });
  protected readonly results = signal<GeocodeResult[]>([]);
  protected readonly searching = signal(false);
  protected readonly searched = signal(false);
  protected readonly searchError = signal(false);
  protected readonly draft = signal<LocationDraft>({ ...EMPTY_DRAFT });

  constructor() {
    effect(() => {
      if (this.open()) {
        const init = this.initial();
        this.draft.set(init ? { ...init } : { ...EMPTY_DRAFT });
        this.results.set([]);
        this.searchError.set(false);
        this.searched.set(false);
        this.query.setValue(init?.placeName ?? '', { emitEvent: false });
      }
    });

    this.query.valueChanges.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      void this.search(q);
    });
  }

  private async search(q: string): Promise<void> {
    const term = q.trim();
    if (term.length < 3) { this.results.set([]); this.searched.set(false); return; }
    this.searching.set(true);
    this.searchError.set(false);
    try {
      const res = await this.geocode.search(term);
      // if query changed meanwhile, ignore
      if (this.query.value.trim() !== term) return;
      this.results.set(res);
      this.searched.set(true);
    } catch {
      if (this.query.value.trim() !== term) return;
      this.searchError.set(true);
      this.results.set([]);
    } finally {
      if (this.query.value.trim() === term) this.searching.set(false);
    }
  }

  protected selectResult(r: GeocodeResult): void {
    this.draft.set({
      latitude: round(r.latitude),
      longitude: round(r.longitude),
      placeName: r.displayName,
    });
    this.results.set([]);
  }

  protected onPointChange(p: LocationPoint): void {
    const prev = this.draft();
    this.draft.set({ latitude: p.latitude, longitude: p.longitude, placeName: prev.placeName });
  }

  protected clear(): void {
    this.draft.set({ ...EMPTY_DRAFT });
    this.query.setValue('', { emitEvent: false });
    this.results.set([]);
    this.searched.set(false);
  }

  protected confirm(): void {
    const d = this.draft();
    if (d.latitude === null || d.longitude === null) return;
    const placeName = (d.placeName ?? this.query.value).trim() || null;
    this.picked.emit({ latitude: round(d.latitude), longitude: round(d.longitude), placeName });
  }
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
