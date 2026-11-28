/** Bloco 16 — regras partilhadas do subtítulo opcional do convite. */
export const SUBTITLE_MAX_LENGTH = 150;

/** O back aceita `null` para limpar; textos vazios viram `null`. */
export function subtitleValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}
