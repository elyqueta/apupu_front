import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { environment } from '../../../environments/environment';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  placeName?: string | null;
}

type MapLibre = typeof import('maplibre-gl');

@Component({
  selector: 'app-location-map',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host { display:block; }
    .map-wrap { position:relative; width:100%; height:260px; border-radius:16px; overflow:hidden; border:1px solid var(--line, #e5e7eb); background:var(--surface-raised,#f8fafc); }
    @media (min-width: 640px) { .map-wrap { height:340px; } }
    .map { width:100%; height:100%; }
    .overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:16px; background:rgba(0,0,0,0.04); }
    .overlay-btn { min-height:44px; padding:0 16px; border-radius:12px; border:1px solid var(--line,#d1d5db); background:var(--surface,#fff); color:var(--ink,#111827); font:600 14px/1.2 system-ui, sans-serif; cursor:pointer; }
    .overlay-btn:focus-visible { outline:2px solid var(--brand,#2563eb); outline-offset:2px; }
    .status { font:12px/1.4 system-ui, sans-serif; color:var(--muted,#6b7280); padding:8px 12px; }
  `],
  template: `
    <div class="map-wrap">
      <div #mapEl class="map" role="img" [attr.aria-label]="ariaLabel()"></div>
      @if (!activated()) {
        <div class="overlay">
          <button type="button" class="overlay-btn" (click)="activate()" [attr.aria-label]="activateLabel()">
            {{ activateLabel() }}
          </button>
        </div>
      }
    </div>
    @if (status()) { <div class="status" aria-live="polite">{{ status() }}</div> }
  `,
})
export class LocationMapComponent implements AfterViewInit, OnDestroy {
  readonly latitude = input<number | null>(null);
  readonly longitude = input<number | null>(null);
  readonly placeName = input<string | null>(null);
  readonly interactive = input(true);
  readonly tapToActivate = input(false);
  readonly ariaLabel = input('Mapa da localização do evento');
  readonly activateLabel = input('Ativar mapa');

  readonly pointChange = output<LocationPoint>();

  private readonly zone = inject(NgZone);
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');

  protected readonly activated = signal(false);
  protected readonly status = signal('');

  private map: import('maplibre-gl').Map | null = null;
  private marker: import('maplibre-gl').Marker | null = null;
  private maplibre: MapLibre | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const lat = this.latitude();
      const lng = this.longitude();
      const name = this.placeName();
      if (this.map && lat != null && lng != null) {
        this.setMarker(lat, lng, name);
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.tapToActivate()) {
      void this.activate();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
    this.map = null;
    this.marker = null;
  }

  protected async activate(): Promise<void> {
    if (this.activated() || this.map) {
      this.activated.set(true);
      return;
    }
    this.activated.set(true);
    this.status.set('A carregar mapa...');
    try {
      const ml = (this.maplibre ??= await import('maplibre-gl'));
      await this.ensureCss();
      const el = this.mapEl().nativeElement;
      const lat = this.latitude() ?? -8.838333;
      const lng = this.longitude() ?? 13.234444;
      const hasPoint = this.latitude() != null && this.longitude() != null;
      const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const map = new ml.Map({
        container: el,
        style: environment.mapStyleUrl,
        center: [lng, lat],
        zoom: hasPoint ? 15 : 12,
        attributionControl: { compact: true },
        interactive: this.interactive(),
      });
      this.map = map;
      map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', () => {
        this.zone.run(() => this.status.set(''));
        if (hasPoint) this.setMarker(this.latitude()!, this.longitude()!, this.placeName());
        if (this.interactive()) {
          map.on('click', (e) => {
            const p = { latitude: round(e.lngLat.lat), longitude: round(e.lngLat.lng), placeName: this.placeName() };
            this.zone.run(() => {
              this.setMarker(p.latitude, p.longitude, p.placeName);
              this.pointChange.emit(p);
            });
          });
        }
        if (!reduced) map.resize();
      });
      map.on('error', () => this.zone.run(() => this.status.set('Não foi possível carregar o mapa.')));
      this.resizeObserver = new ResizeObserver(() => map.resize());
      this.resizeObserver.observe(el);
    } catch {
      this.status.set('Não foi possível carregar o mapa.');
    }
  }

  private setMarker(lat: number, lng: number, placeName?: string | null): void {
    if (!this.map || !this.maplibre) return;
    const lngLat: [number, number] = [lng, lat];
    if (!this.marker) {
      this.marker = new this.maplibre.Marker({ draggable: this.interactive() });
      this.marker.setLngLat(lngLat).addTo(this.map);
      if (this.interactive()) {
        this.marker.on('dragend', () => {
          const pos = this.marker!.getLngLat();
          const p = { latitude: round(pos.lat), longitude: round(pos.lng), placeName: placeName ?? this.placeName() };
          this.pointChange.emit(p);
        });
      }
    } else {
      this.marker.setLngLat(lngLat);
      this.marker.setDraggable(this.interactive());
    }
    if (placeName) this.marker.getElement().setAttribute('title', placeName);
    this.map.easeTo({ center: lngLat, duration: 0 });
  }

  private async ensureCss(): Promise<void> {
    const id = 'maplibre-gl-css';
    if (document.getElementById(id)) return;
    await new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('css'));
      document.head.appendChild(link);
    });
  }
}

function round(v: number): number { return Math.round(v * 1e6) / 1e6; }
