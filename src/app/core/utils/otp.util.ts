/**
 * Distribui os dígitos de um código OTP pelas caixas de um input segmentado.
 *
 * É usada tanto pelo evento `paste` como pelo fallback de `input`, porque
 * alguns teclados móveis e o preenchimento automático do sistema inserem o
 * código completo directamente na caixa focada sem disparar `paste`.
 *
 * - Um código completo (ou mais longo) começa sempre na primeira caixa.
 * - Um código parcial começa na caixa onde o utilizador colou.
 * - As caixas depois do trecho colado são limpas para não misturar códigos.
 */
export function distributeOtpDigits(
  current: readonly string[],
  text: string,
  startIndex = 0,
): string[] {
  const allDigits = text.replace(/\D/g, '');
  if (!allDigits || current.length === 0) {
    return [...current];
  }

  // Um valor maior do que o número de caixas costuma ser o código colado
  // depois do dígito que já estava na caixa. Ficamos com o fim, que é o
  // trecho realmente colado.
  const digits = allDigits.length > current.length ? allDigits.slice(-current.length) : allDigits;
  const offset = digits.length >= current.length ? 0 : Math.max(0, startIndex);
  const next = [...current];

  for (let i = 0; i < next.length; i += 1) {
    if (i < offset) {
      continue;
    }

    const digitIndex = i - offset;
    next[i] = digitIndex < digits.length ? digits[digitIndex] : '';
  }

  return next;
}
