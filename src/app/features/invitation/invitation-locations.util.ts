/** Bloco 16 — o mesmo cálculo do back (`src/utils/maps.util.ts`). */
export interface MapsLocation {
  kind: 'venue' | 'online';
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const BASE = 'https://www.google.com/maps/search/?api=1&query=';

/** Coordenadas com 6 casas e ponto decimal, independentes do locale. */
export function mapsUrl(location: MapsLocation): string | null {
  if (location.kind === 'online') return null;
  const { latitude, longitude } = location;
  if (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude)
  ) {
    return `${BASE}${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  }
  const query = [location.address?.trim(), location.city?.trim()].filter(Boolean).join(', ');
  return query ? `${BASE}${encodeURIComponent(query)}` : null;
}
