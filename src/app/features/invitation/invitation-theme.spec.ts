import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../core/utils/contrast';
import { invitationThemeVars } from './invitation-shell.component';
import { DEFAULT_MANIFEST } from '../../core/models/template-manifest';

/**
 * Bloco 16 — a área do convite pertence ao template. Nenhuma classe de tema
 * da plataforma pode aparecer em `features/invitation/**`.
 */
const SOURCES = import.meta.glob('./**/*.{ts,html}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const BANNED = [
  'bg-surface',
  'bg-surface-raised',
  'text-ink',
  'text-muted',
  'border-line',
  'text-brand',
  'bg-brand',
  'shadow-card',
  'ui-btn',
];

describe('Bloco 16 — tema do convite', () => {
  it('não usa classes de tema da plataforma em features/invitation', () => {
    const failures: string[] = [];
    for (const [path, source] of Object.entries(SOURCES)) {
      if (path.endsWith('.spec.ts')) continue;
      source.split('\n').forEach((line, index) => {
        // O token de sombra é legítimo dentro de CSS (var(--shadow-card));
        // o que se proíbe é o utilitário de tema da plataforma.
        if (line.includes('var(--shadow-card)') || line.includes('--shadow-card:')) return;
        for (const token of BANNED) {
          if (line.includes(token)) failures.push(`${path}:${index + 1} — ${token}`);
        }
      });
    }
    expect(failures).toEqual([]);
  });

  it('deriva variáveis legíveis mesmo com um manifesto incompleto', () => {
    const vars = invitationThemeVars(DEFAULT_MANIFEST);
    expect(vars['--inv-bg']).toBe(DEFAULT_MANIFEST.palette.bg);
    expect(vars['--inv-accent']).toBe(DEFAULT_MANIFEST.palette.accent);
    expect(contrastRatio(vars['--inv-ink'], vars['--inv-bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(vars['--inv-muted'], vars['--inv-bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(vars['--inv-accent-ink'], vars['--inv-accent'])).toBeGreaterThanOrEqual(4.5);
    expect(vars['--inv-line']).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
