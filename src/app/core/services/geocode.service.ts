import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../api/api-client';

export interface GeocodeResult {
  displayName: string;
  latitude: number;
  longitude: number;
  type: string | null;
  importance: number | null;
}

@Injectable({ providedIn: 'root' })
export class GeocodeService {
  private readonly api = inject(ApiClient);

  async search(q: string, countrycodes?: string): Promise<GeocodeResult[]> {
    const query = q.trim();
    if (query.length < 3) return [];
    return this.api.get<GeocodeResult[]>('/host/geocode', {
      q: query,
      ...(countrycodes ? { countrycodes } : {}),
    });
  }
}
