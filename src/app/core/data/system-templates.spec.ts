import { describe, expect, it } from 'vitest';
import { SYSTEM_TEMPLATES } from './system-templates';

/** Contraste WCAG 2.1 entre duas cores hex (sem transparência). */
function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const value = hex.replace('#', '');
    const channels = [0, 2, 4]
      .map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255)
      .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
    return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('Bloco 15B — catálogo de sistema', () => {
  it('mantém texto e texto secundário com contraste ≥ 4.5:1 em todos os templates', () => {
    expect(SYSTEM_TEMPLATES).toHaveLength(19);
    const failures: string[] = [];
    for (const template of SYSTEM_TEMPLATES) {
      const { bg, ink, muted } = template.manifest.palette;
      const inkRatio = contrastRatio(ink, bg);
      const mutedRatio = contrastRatio(muted, bg);
      if (inkRatio < 4.5) failures.push(`${template.slug}: ink/bg ${inkRatio.toFixed(2)}`);
      if (mutedRatio < 4.5) failures.push(`${template.slug}: muted/bg ${mutedRatio.toFixed(2)}`);
    }
    expect(failures).toEqual([]);
  });
});
