/**
 * Máscara de telefone: separa os dígitos em grupos de três.
 *
 * O `+` inicial é preservado quando o utilizador o escreve, mas o formulário
 * indica que não é preciso adicionar `+244` — os 9 dígitos locais bastam.
 */
export function formatPhoneMask(value: string): string {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '').slice(0, 15);
  const groups = digits.match(/.{1,3}/g) ?? [];
  return `${hasPlus ? '+' : ''}${groups.join(' ')}`.trim();
}
