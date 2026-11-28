import type { EventLocationInput, EventLocation, PublicLocation } from './api.models';
import type { EventLocationEntry } from '../models/models';
import { normalizeLocations } from '../utils/event-locations';

const round = (value: number): number => Math.round(value * 1e6) / 1e6;
const optionalText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Lê `locations[]` (principal primeiro); eventos antigos caem no espelho legado. */
export function entriesFromApi(
  locations: PublicLocation[] | undefined,
  legacy: EventLocation | undefined,
): EventLocationEntry[] {
  if (locations?.length) {
    return normalizeLocations(
      locations.map((item) => ({
        id: item.id ?? null,
        isPrimary: Boolean(item.is_primary),
        kind: item.kind === 'online' ? 'online' : 'venue',
        address: optionalText(item.address),
        venueName: optionalText(item.venue_name),
        label: optionalText(item.label),
        startsAt: item.starts_at ?? null,
        city: optionalText(item.city),
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        onlineUrl: optionalText(item.online_url),
      })),
    );
  }

  if (!legacy) return [];
  if (legacy.type === 'online' && legacy.online_url) {
    return [
      {
        id: null,
        isPrimary: true,
        kind: 'online',
        address: null,
        venueName: null,
        label: optionalText(legacy.place_label),
        startsAt: null,
        city: null,
        latitude: null,
        longitude: null,
        onlineUrl: legacy.online_url,
      },
    ];
  }

  const address = optionalText(legacy.address) ?? optionalText(legacy.name);
  if (!address && legacy.latitude == null && legacy.longitude == null) return [];
  return [
    {
      id: null,
      isPrimary: true,
      kind: 'venue',
      address,
      venueName: optionalText(legacy.name),
      label: optionalText(legacy.place_label),
      startsAt: null,
      city: null,
      latitude: legacy.latitude ?? null,
      longitude: legacy.longitude ?? null,
      onlineUrl: null,
    },
  ];
}

/** Corpo da API: principal primeiro e sem `id: null` (o back rejeita). */
export function entriesToApi(entries: EventLocationEntry[]): EventLocationInput[] {
  return normalizeLocations(entries).map((item) => {
    const common = {
      ...(item.id ? { id: item.id } : {}),
      is_primary: item.isPrimary,
      ...(optionalText(item.label) ? { label: optionalText(item.label) } : {}),
      ...(item.startsAt ? { starts_at: item.startsAt } : {}),
    };
    if (item.kind === 'online') {
      return {
        ...common,
        kind: 'online' as const,
        online_url: (item.onlineUrl ?? '').trim(),
      };
    }
    return {
      ...common,
      kind: 'venue' as const,
      address: (item.address ?? '').trim(),
      venue_name: optionalText(item.venueName),
      city: optionalText(item.city),
      latitude: item.latitude == null ? null : round(item.latitude),
      longitude: item.longitude == null ? null : round(item.longitude),
    };
  });
}

/** Espelho legado da principal, mantido por compatibilidade com feed/PDF antigo. */
export function legacyFromEntries(
  entries: EventLocationEntry[],
  fallback: EventLocation,
): EventLocation {
  const primary = normalizeLocations(entries)[0];
  if (!primary) return fallback;
  if (primary.kind === 'online' && primary.onlineUrl?.trim()) {
    return { type: 'online', online_url: primary.onlineUrl.trim() };
  }
  const address = (primary.address ?? '').trim();
  return {
    type: 'venue',
    name: (primary.venueName ?? '').trim() || address,
    address: address || null,
    latitude: primary.latitude ?? null,
    longitude: primary.longitude ?? null,
    place_label: optionalText(primary.label),
    place_name: optionalText(primary.venueName),
  };
}
