import { formatPhoneMask, isValidPhone, phoneDigits } from './phone.util';

describe('phone.util', () => {
  it('aceita só dígitos, a começar por 9, no máximo 9', () => {
    expect(formatPhoneMask('9a2b3')).toBe('923');
    expect(formatPhoneMask('923456789123')).toBe('923 456 789');
    expect(formatPhoneMask('123')).toBe('');
    expect(formatPhoneMask('8923')).toBe('923');
  });

  it('separa a cada três dígitos', () => {
    expect(formatPhoneMask('9234')).toBe('923 4');
    expect(formatPhoneMask('923456789')).toBe('923 456 789');
  });

  it('normaliza valores antigos com indicativo', () => {
    expect(phoneDigits('+244 923 456 789')).toBe('923456789');
    expect(phoneDigits('00244923456789')).toBe('923456789');
    expect(formatPhoneMask('+244923456789')).toBe('923 456 789');
  });

  it('valida 9 dígitos a começar por 9 (vazio é permitido)', () => {
    expect(isValidPhone('')).toBe(true);
    expect(isValidPhone('923 456 789')).toBe(true);
    expect(isValidPhone('923 456')).toBe(false);
  });
});
