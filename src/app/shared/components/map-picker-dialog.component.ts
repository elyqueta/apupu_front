import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { environment } from '../../../environments/environment';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { ModalComponent } from './modal.component';

export interface MapPoint {
  latitude: number;
  longitude: number;
}

export interface MapPickResult extends MapPoint {
  city?: string;
  venue?: string;
}

/** Centro por omissão: Luanda. */
const DEFAULT_CENTER: MapPoint = { latitude: -8.8383, longitude: 13.2344 };

type GoogleMaps = {
  maps: {
    Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMap;
    Marker: new (opts: Record<string, unknown>) => GoogleMarker;
    Geocoder: new () => GoogleGeocoder;
    event: { clearInstanceListeners(instance: unknown): void };
  };
};

type GoogleMap = {
  setCenter(latLng: { lat: number; lng: number }): void;
  setZoom(zoom: number): void;
  addListener(event: string, handler: (e: { latLng?: { lat(): number; lng(): number } }) => void): void;
};

type GoogleMarker = {
  setPosition(latLng: { lat: number; lng: number }): void;
  getPosition(): { lat(): number; lng(): number } | null;
  addListener(event: string, handler: () => void): void;
  setMap(map: GoogleMap | null): void;
};

type GoogleLatLng = { lat(): number; lng(): number } | { lat: number; lng: number };

type GoogleGeocoderResult = {
  formatted_address?: string;
  address_components?: { long_name: string; short_name: string; types: string[] }[];
  geometry?: { location?: GoogleLatLng };
};

type GoogleGeocoder = {
  geocode(request: { location?: { lat: number; lng: number }; address?: string }): Promise<{ results: GoogleGeocoderResult[] }>;
};

declare global {
  interface Window {
    google?: GoogleMaps;
    __apupuGoogleMapsPromise?: Promise<GoogleMaps>;
  }
}

/** Arredonda a 6 casas (o mesmo que `numeric(9,6)` no back). */
export function roundCoord(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function loadGoogleMaps(key: string): Promise<GoogleMaps> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no browser'));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (window.__apupuGoogleMapsPromise) return window.__apupuGoogleMapsPromise;
  window.__apupuGoogleMapsPromise = new Promise<GoogleMaps>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps]');
    if (existing) {
      existing.addEventListener('load', () => (window.google?.maps ? resolve(window.google) : reject(new Error('google maps unavailable'))));
      existing.addEventListener('error', () => reject(new Error('google maps failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&language=pt&region=AO`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps', '');
    script.onload = () => (window.google?.maps ? resolve(window.google) : reject(new Error('google maps unavailable')));
    script.onerror = () => reject(new Error('google maps failed'));
    document.head.appendChild(script);
  });
  return window.__apupuGoogleMapsPromise;
}

function pickAddress(components: { long_name: string; short_name: string; types: string[] }[] = []): { city?: string; venue?: string } {
  const byType = (...types: string[]) => components.find((c) => types.some((t) => c.types.includes(t)))?.long_name;
  const city = byType('locality', 'administrative_area_level_2', 'administrative_area_level_1');
  const venue =
    byType('point_of_interest', 'establishment', 'premise', 'route') ??
    byType('neighborhood', 'sublocality', 'sublocality_level_1');
  return { city: city || undefined, venue: venue || undefined };
}

export async function reverseGeocodeGoogle(lat: number, lng: number): Promise<{ city?: string; venue?: string }> {
  if (typeof window === 'undefined') return {};
  const key = environment.googleMapsApiKey;
  if (!key) return {};
  try {
    const gmaps = await loadGoogleMaps(key);
    const geocoder = new gmaps.maps.Geocoder();
    const response = await geocoder.geocode({ location: { lat, lng } });
    return pickAddress(response.results[0]?.address_components ?? []);
  } catch {
    return {};
  }
}

/**
 * Bloco 14 — escolher o ponto exato no mapa (Google Maps). O script só é
 * carregado quando o modal abre. Marcador arrastável, toque no mapa para mover
 * e pesquisa por morada. Ao confirmar, faz reverse geocoding para preencher
 * cidade/local. As ações ficam no fim, nunca fixas.
 */
@Component({
  selector: 'app-map-picker-dialog',
  imports: [ModalComponent, FaIconComponent],
  template: `
    <app-modal [open]="open()" [title]="i18n.t('block14.location.mapTitle')" size="full" (closed)="closed.emit()">
      <div class="flex h-full min-h-0 flex-col gap-3">
        <p class="text-xs leading-5 text-muted">{{ i18n.t('block14.location.mapHint') }}</p>
        <form class="flex gap-2" (submit)="$event.preventDefault(); search()">
          <label class="relative block flex-1">
            <span class="sr-only">{{ i18n.t('block14.location.search') }}</span>
            <input
              type="search"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50"
              [placeholder]="i18n.t('block14.location.search')"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
          </label>
          <button type="submit" class="ui-btn-secondary" [disabled]="searching() || query().trim().length < 3">
            <fa-icon [icon]="icons['search']" aria-hidden="true" />
            <span class="hidden sm:inline">{{ i18n.t('block14.location.searchButton') }}</span>
          </button>
        </form>
        @if (searchMessage()) {
          <p class="text-xs text-muted" role="status">{{ searchMessage() }}</p>
        }
        <div #mapHost class="min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-line bg-surface-raised" data-testid="map-picker"></div>
        @if (error()) {
          <p class="text-xs text-coral" role="alert">{{ error() }}</p>
        }
        @if (point(); as p) {
          <p class="text-xs text-muted" data-testid="map-picker-point">{{ i18n.t('block14.location.set', { lat: p.latitude, lng: p.longitude }) }}</p>
        }
        <div class="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" class="ui-btn-secondary" [disabled]="confirming()" (click)="closed.emit()">{{ i18n.t('block14.location.cancel') }}</button>
          <button type="button" class="ui-btn" [disabled]="!point() || confirming()" (click)="confirm()">
            <fa-icon [icon]="confirming() ? icons['spinner'] : icons['mapPin']" [animation]="confirming() ? 'spin' : undefined" aria-hidden="true" />
            {{ confirming() ? i18n.t('common.loading') : i18n.t('block14.location.confirm') }}
          </button>
        </div>
      </div>
    </app-modal>
  `,
})
export class MapPickerDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly toasts = inject(ToastService);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly open = input(false);
  readonly initial = input<MapPoint | null>(null);
  readonly picked = output<MapPickResult>();
  readonly closed = output<void>();

  protected readonly point = signal<MapPoint | null>(null);
  protected readonly query = signal('');
  protected readonly searching = signal(false);
  protected readonly searchMessage = signal('');
  protected readonly error = signal('');
  protected readonly confirming = signal(false);
  private readonly mapHost = viewChild<ElementRef<HTMLElement>>('mapHost');

  private gmaps: GoogleMaps | null = null;
  private map: GoogleMap | null = null;
  private marker: GoogleMarker | null = null;
  private geocoder: GoogleGeocoder | null = null;

  constructor() {
    effect(() => {
      const open = this.open();
      const host = this.mapHost();
      untracked(() => {
        if (open && host) void this.setup(host.nativeElement);
        if (!open) this.teardown();
      });
    });
  }

  private async setup(element: HTMLElement): Promise<void> {
    if (!this.browser || this.map) return;
    this.error.set('');
    const key = environment.googleMapsApiKey;
    if (!key) {
      this.error.set(this.i18n.t('block14.location.mapError'));
      return;
    }
    try {
      const gmaps = (this.gmaps ??= await loadGoogleMaps(key));
      this.geocoder ??= new gmaps.maps.Geocoder();
      const start = this.initial() ?? DEFAULT_CENTER;
      this.point.set(this.initial());
      const map = new gmaps.maps.Map(element, {
        center: { lat: start.latitude, lng: start.longitude },
        zoom: this.initial() ? 16 : 12,
        mapTypeControl: true,
        mapTypeControlOptions: { position: 3 },
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });
      const marker = new gmaps.maps.Marker({
        position: { lat: start.latitude, lng: start.longitude },
        map,
        draggable: true,
      });
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) this.setPoint(pos.lat(), pos.lng());
      });
      map.addListener('click', (e) => {
        const latLng = e.latLng;
        if (!latLng) return;
        marker.setPosition({ lat: latLng.lat(), lng: latLng.lng() });
        this.setPoint(latLng.lat(), latLng.lng());
      });
      this.map = map;
      this.marker = marker;
    } catch {
      this.error.set(this.i18n.t('block14.location.mapError'));
    }
  }

  private setPoint(lat: number, lng: number): void {
    this.point.set({ latitude: roundCoord(lat), longitude: roundCoord(lng) });
  }

  protected async search(): Promise<void> {
    const q = this.query().trim();
    if (q.length < 3 || !this.map || !this.marker || !this.geocoder) return;
    this.searching.set(true);
    this.searchMessage.set('');
    try {
      const queries = /angola/i.test(q) ? [q] : [q, `${q}, Angola`];
      let first: GoogleGeocoderResult | undefined;
      for (const address of queries) {
        const response = await Promise.race([
          this.geocoder.geocode({ address }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('geocode timeout')), 4000)),
        ]);
        first = response.results[0];
        if (first?.geometry?.location) break;
      }
      const loc = first?.geometry?.location;
      if (!first || !loc) {
        const message = this.i18n.t('block14.location.noResults');
        this.searchMessage.set(message);
        this.toasts.info(message);
        return;
      }
      const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
      const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
      this.marker.setPosition({ lat, lng });
      this.map.setCenter({ lat, lng });
      this.map.setZoom(16);
      this.setPoint(lat, lng);
    } catch {
      const message = this.i18n.t('block14.location.noResults');
      this.searchMessage.set(message);
      this.toasts.error(message);
    } finally {
      this.searching.set(false);
    }
  }

  protected async confirm(): Promise<void> {
    const point = this.point();
    if (!point) return;
    this.confirming.set(true);
    let address: { city?: string; venue?: string } = {};
    try {
      if (this.geocoder) {
        const response = await Promise.race([
          this.geocoder.geocode({ location: { lat: point.latitude, lng: point.longitude } }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('geocode timeout')), 4000)),
        ]);
        const first = response.results[0];
        address = pickAddress(first?.address_components ?? []);
      }
    } catch {
      // O ponto já é válido; o preenchimento automático é best-effort.
    } finally {
      this.confirming.set(false);
    }
    this.picked.emit({ ...point, ...address });
  }

  private teardown(): void {
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
    if (this.map) {
      try { this.gmaps?.maps.event.clearInstanceListeners(this.map); } catch { /* ignore */ }
      this.map = null;
    }
  }
}
