import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../utils/contrast';
import { SYSTEM_TEMPLATES } from './system-templates';

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
