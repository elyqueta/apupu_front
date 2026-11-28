import { describe, expect, it } from 'vitest';
import { mapsUrl } from './invitation-locations.util';

/** Casos idênticos aos do back (`tests/maps.util.test.ts`). */
describe('Bloco 16 — mapsUrl', () => {
  it('usa coordenadas com 6 casas decimais', () => {
    expect(
      mapsUrl({ kind: 'venue', latitude: -8.8383334, longitude: 13.2344449, address: 'Rua A' }),
    ).toBe('https://www.google.com/maps/search/?api=1&query=-8.838333,13.234445');
  });

  it('procura o endereço e a cidade quando não há coordenadas', () => {
    expect(mapsUrl({ kind: 'venue', address: 'Rua São João, 12', city: 'Luanda' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=Rua%20S%C3%A3o%20Jo%C3%A3o%2C%2012%2C%20Luanda',
    );
  });

  it('codifica caracteres especiais', () => {
    expect(mapsUrl({ kind: 'venue', address: 'Praça & Cia?', city: '' })).toContain(
      'Pra%C3%A7a%20%26%20Cia%3F',
    );
  });

  it('devolve null sem endereço nem coordenadas', () => {
    expect(mapsUrl({ kind: 'venue', address: '  ', city: null })).toBeNull();
  });

  it('ignora coordenadas incompletas e usa o endereço', () => {
    expect(mapsUrl({ kind: 'venue', latitude: -8.8, address: 'Só latitude' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=S%C3%B3%20latitude',
    );
  });

  it('não devolve link de mapas para eventos online', () => {
    expect(mapsUrl({ kind: 'online', address: 'Rua A', latitude: 1, longitude: 2 })).toBeNull();
  });
});
