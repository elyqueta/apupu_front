/**
 * Telefone angolano (Bloco 10): os campos aceitam apenas os 9 dígitos
 * locais, a começar por 9, mostrados em grupos de três (`9XX XXX XXX`).
 *
 * Valores antigos com indicativo (`+244 923 …`, `00244…`) ou com zero à
 * esquerda são normalizados para os 9 dígitos locais. Letras e outros
 * símbolos são descartados.
 */
export const PHONE_DIGITS = 9;

/** Dígitos locais (máx. 9, sempre a começar por 9) de qualquer texto. */
export function phoneDigits(value: string | null | undefined): string {
  let digits = (value ?? '').replace(/\D/g, '');

  if (digits.startsWith('00244')) {
    digits = digits.slice(5);
  } else if (digits.startsWith('244') && digits.length > PHONE_DIGITS) {
    digits = digits.slice(3);
  }

  // O número local começa obrigatoriamente por 9: descarta o que vier antes.
  const firstNine = digits.indexOf('9');
  digits = firstNine === -1 ? '' : digits.slice(firstNine);

  return digits.slice(0, PHONE_DIGITS);
}

/** Máscara com separação a cada três dígitos: `923 456 789`. */
export function formatPhoneMask(value: string | null | undefined): string {
  const groups = phoneDigits(value).match(/.{1,3}/g) ?? [];
  return groups.join(' ');
}

/** `true` para vazio (campo opcional) ou exactamente 9 dígitos a começar por 9. */
export function isValidPhone(value: string | null | undefined): boolean {
  const raw = (value ?? '').trim();
  if (raw === '') return true;
  return /^9\d{8}$/.test(phoneDigits(raw)) && phoneDigits(raw).length === PHONE_DIGITS;
}
