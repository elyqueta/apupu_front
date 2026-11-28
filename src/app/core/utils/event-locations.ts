import type { TranslationKey } from '../i18n/translations';
import type { EventLocationEntry } from '../models/models';

/** Bloco 16 — regras partilhadas pela lista de locais do anfitrião. */
export const MAX_EVENT_LOCATIONS = 5;

export function emptyLocation(): EventLocationEntry {
  return {
    isPrimary: true,
    kind: 'venue',
    address: '',
    venueName: null,
    label: null,
    startsAt: null,
    city: null,
    latitude: null,
    longitude: null,
    onlineUrl: null,
  };
}

/** Garante exatamente uma principal; sem marcação, promove a primeira. */
export function normalizeLocations(list: EventLocationEntry[]): EventLocationEntry[] {
  const marked = list.findIndex((item) => item.isPrimary);
  const primary = marked === -1 ? 0 : marked;
  return list.map((item, index) => ({ ...item, isPrimary: index === primary }));
}

export function canAddLocation(list: EventLocationEntry[]): boolean {
  return list.length < MAX_EVENT_LOCATIONS;
}

export function moveLocation(
  list: EventLocationEntry[],
  index: number,
  direction: -1 | 1,
): EventLocationEntry[] {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function removeLocation(list: EventLocationEntry[], index: number): EventLocationEntry[] {
  if (index < 0 || index >= list.length) return list;
  return normalizeLocations(list.filter((_, current) => current !== index));
}

export function hasExactLocation(item: EventLocationEntry): boolean {
  return typeof item.latitude === 'number' && typeof item.longitude === 'number';
}

/** Chave de erro i18n, ou `''` quando o local é válido. */
export function locationError(item: EventLocationEntry): TranslationKey | '' {
  if (item.kind === 'online') {
    const url = (item.onlineUrl ?? '').trim();
    if (!url) return 'block16.locations.onlineRequired';
    if (!url.startsWith('https://')) return 'block16.locations.onlineHttps';
    return '';
  }
  const address = (item.address ?? '').trim();
  if (!address) return 'block16.locations.addressRequired';
  if (address.length < 3) return 'block16.locations.addressMin';
  if (address.length > 240) return 'block16.locations.addressMax';
  if ((item.latitude == null) !== (item.longitude == null)) {
    return 'block16.locations.coordsMismatch';
  }
  return '';
}

/** `starts_at` é um instante; a hora introduzida é interpretada no fuso do evento. */
export function timeToIso(time: string, date: string, timeZone: string): string | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '1970-01-01';
  const [year, month, dateOfMonth] = day.split('-').map(Number);
  const naive = Date.UTC(year!, month! - 1, dateOfMonth!, hour!, minute!, 0);
  if (Number.isNaN(naive)) return null;
  let offset: number;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date(naive));
    const part = (type: Intl.DateTimeFormatPartTypes): number =>
      Number(parts.find((entry) => entry.type === type)?.value ?? 0);
    const asUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'));
    offset = asUtc - naive;
  } catch {
    offset = 0;
  }
  return new Date(naive - offset).toISOString();
}

/** Hora de um `starts_at` para o campo `type="time"` (no fuso do evento). */
export function isoToTime(value: string | null | undefined, timeZone: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}
