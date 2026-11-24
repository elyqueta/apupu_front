export interface PreferredLocation {
  latitude: number;
  longitude: number;
  city?: string;
  venue?: string;
  placeLabel?: string;
}

const KEY = 'apupu.preferredLocation';

export function readPreferredLocation(): PreferredLocation | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PreferredLocation>;
    if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') return null;
    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      city: typeof parsed.city === 'string' ? parsed.city : undefined,
      venue: typeof parsed.venue === 'string' ? parsed.venue : undefined,
      placeLabel: typeof parsed.placeLabel === 'string' ? parsed.placeLabel : undefined,
    };
  } catch {
    return null;
  }
}

export function writePreferredLocation(value: PreferredLocation): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}
