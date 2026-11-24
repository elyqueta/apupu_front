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
import type * as Leaflet from 'leaflet';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { ModalComponent } from './modal.component';

export interface MapPoint {
  latitude: number;
  longitude: number;
}

/** Centro por omissão: Luanda. */
const DEFAULT_CENTER: MapPoint = { latitude: -8.8383, longitude: 13.2344 };
const LEAFLET_CSS = 'vendor/leaflet/leaflet.css';

/** Arredonda a 6 casas (o mesmo que `numeric(9,6)` no back). */
export function roundCoord(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Bloco 14 — escolher o ponto exato no mapa (Leaflet + OpenStreetMap, sem
 * chave). O Leaflet e o CSS só são carregados quando o modal abre. Marcador
 * arrastável, toque no mapa para mover e pesquisa opcional (Nominatim).
 * Respeita a atribuição do OSM. As ações ficam no fim, nunca fixas.
 */
@Component({
  selector: 'app-map-picker-dialog',
  imports: [ModalComponent, FaIconComponent],
  template: `
    <app-modal [open]="open()" [title]="i18n.t('block14.location.mapTitle')" size="lg" (closed)="closed.emit()">
      <div class="flex flex-col gap-3">
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
        <div #mapHost class="h-72 w-full overflow-hidden rounded-2xl border border-line bg-surface-raised sm:h-96" data-testid="map-picker"></div>
        @if (error()) {
          <p class="text-xs text-coral" role="alert">{{ error() }}</p>
        }
        @if (point(); as p) {
          <p class="text-xs text-muted" data-testid="map-picker-point">{{ i18n.t('block14.location.set', { lat: p.latitude, lng: p.longitude }) }}</p>
        }
        <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" class="ui-btn-secondary" (click)="closed.emit()">{{ i18n.t('block14.location.cancel') }}</button>
          <button type="button" class="ui-btn" [disabled]="!point()" (click)="confirm()">
            <fa-icon [icon]="icons['mapPin']" aria-hidden="true" />
            {{ i18n.t('block14.location.confirm') }}
          </button>
        </div>
      </div>
    </app-modal>
  `,
})
export class MapPickerDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly open = input(false);
  readonly initial = input<MapPoint | null>(null);
  readonly picked = output<MapPoint>();
  readonly closed = output<void>();

  protected readonly point = signal<MapPoint | null>(null);
  protected readonly query = signal('');
  protected readonly searching = signal(false);
  protected readonly searchMessage = signal('');
  protected readonly error = signal('');
  private readonly mapHost = viewChild<ElementRef<HTMLElement>>('mapHost');

  private leaflet: typeof Leaflet | null = null;
  private map: Leaflet.Map | null = null;
  private marker: Leaflet.Marker | null = null;

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
    try {
      this.ensureCss();
      const L = (this.leaflet ??= (await import('leaflet')).default ?? (await import('leaflet')));
      const start = this.initial() ?? DEFAULT_CENTER;
      this.point.set(this.initial());
      const map = L.map(element, { center: [start.latitude, start.longitude], zoom: this.initial() ? 16 : 12 });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(map);
      const icon = L.icon({
        iconUrl: 'vendor/leaflet/images/marker-icon.png',
        iconRetinaUrl: 'vendor/leaflet/images/marker-icon-2x.png',
        shadowUrl: 'vendor/leaflet/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      const marker = L.marker([start.latitude, start.longitude], { draggable: true, icon, keyboard: true }).addTo(map);
      marker.on('dragend', () => this.setPoint(marker.getLatLng().lat, marker.getLatLng().lng));
      map.on('click', (event: Leaflet.LeafletMouseEvent) => {
        marker.setLatLng(event.latlng);
        this.setPoint(event.latlng.lat, event.latlng.lng);
      });
      this.map = map;
      this.marker = marker;
      // O modal anima a abertura: recalcula o tamanho depois de visível.
      setTimeout(() => map.invalidateSize(), 250);
    } catch {
      this.error.set(this.i18n.t('block14.location.mapError'));
    }
  }

  private setPoint(lat: number, lng: number): void {
    this.point.set({ latitude: roundCoord(lat), longitude: roundCoord(lng) });
  }

  private ensureCss(): void {
    if (this.document.querySelector(`link[data-leaflet]`)) return;
    const link = this.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    link.setAttribute('data-leaflet', '');
    this.document.head.appendChild(link);
  }

  /** Pesquisa de morada (Nominatim, uso leve e só a pedido do utilizador). */
  protected async search(): Promise<void> {
    const q = this.query().trim();
    if (q.length < 3 || !this.map || !this.marker) return;
    this.searching.set(true);
    this.searchMessage.set('');
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      const results = (await response.json()) as Array<{ lat: string; lon: string }>;
      const first = results[0];
      if (!first) {
        this.searchMessage.set(this.i18n.t('block14.location.noResults'));
        return;
      }
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      this.marker.setLatLng([lat, lng]);
      this.map.setView([lat, lng], 16);
      this.setPoint(lat, lng);
    } catch {
      this.searchMessage.set(this.i18n.t('block14.location.noResults'));
    } finally {
      this.searching.set(false);
    }
  }

  protected confirm(): void {
    const point = this.point();
    if (point) this.picked.emit(point);
  }

  private teardown(): void {
    this.map?.remove();
    this.map = null;
    this.marker = null;
  }
}
