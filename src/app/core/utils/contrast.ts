/** Contraste WCAG 2.1 e mistura de cores hex — usado pelo tema do convite. */

const HEX = /^#[0-9a-f]{6}$/i;

function channels(hex: string): [number, number, number] {
  const value = HEX.test(hex) ? hex : '#000000';
  return [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Texto legível sobre uma cor qualquer: preto ou branco, conforme o contraste. */
export function readableInk(background: string): string {
  return contrastRatio('#FFFFFF', background) >= contrastRatio('#000000', background)
    ? '#FFFFFF'
    : '#000000';
}

/** Mistura linear `weight` de `first` sobre `second` (0 = second, 1 = first). */
export function mixHex(first: string, second: string, weight: number): string {
  const a = channels(first);
  const b = channels(second);
  const clamped = Math.max(0, Math.min(1, weight));
  return `#${a
    .map((channel, index) =>
      Math.round(channel * clamped + b[index]! * (1 - clamped))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** Aproxima uma cor até atingir contraste ≥ 4.5:1 sobre o fundo. */
export function ensureContrast(candidate: string, background: string): string {
  if (contrastRatio(candidate, background) >= 4.5) return candidate;
  const toward = readableInk(background);
  for (let weight = 0.55; weight <= 1; weight += 0.05) {
    const next = mixHex(toward, candidate, weight);
    if (contrastRatio(next, background) >= 4.5) return next;
  }
  return toward;
}
