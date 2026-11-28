import { describe, expect, it } from 'vitest';

/**
 * Bloco 16 — política de sombras.
 *
 * Só existem dois níveis (`shadow-card` e `shadow-pop`). O teste falha se
 * aparecer um nível da escala por omissão do Tailwind, uma sombra arbitrária
 * ou uma sombra colorida. Cada exceção abaixo precisa de motivo documentado.
 */
const EXCEPTIONS: { file: string; pattern: RegExp; reason: string }[] = [
  {
    file: 'src/styles.css',
    pattern: /--shadow-\*: initial;/,
    reason: 'Reposição da escala por omissão do Tailwind; não cria utilitários novos.',
  },
];

const FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  { pattern: /shadow-(?:xs|sm|md|lg|xl|2xl|inner)\b/, reason: 'nível fora da política' },
  { pattern: /shadow-\[/, reason: 'sombra arbitrária' },
  { pattern: /shadow-[a-z][\w-]*\/[\d.]+/, reason: 'sombra colorida' },
  { pattern: /drop-shadow(?!\(none\))/, reason: 'sombra de contorno não normalizada' },
];

const TOKENIZED_BOX_SHADOW =
  /box-shadow:\s*var\(--(?:shadow-card|shadow-pop|ap-shadow-card|ap-shadow-pop|cc-shadow-card)\)/;

/** Os ficheiros são lidos como texto pelo Vite; nenhum módulo Node entra no bundle do browser. */
const SOURCES = import.meta.glob('../**/*.{ts,html,css}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function sourceName(path: string): string {
  return path.startsWith('./') ? `src/app/${path.slice(2)}` : path.replace(/^\.\.\//, 'src/');
}

describe('Bloco 16 — política de sombras', () => {
  it('só permite --shadow-card e --shadow-pop em src/**/*.{ts,html,css}', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(0);
    const failures: string[] = [];
    for (const [path, source] of Object.entries(SOURCES)) {
      const file = sourceName(path);
      source.split('\n').forEach((line, index) => {
        for (const { pattern, reason } of FORBIDDEN) {
          if (!pattern.test(line)) continue;
          if (EXCEPTIONS.some((e) => e.file === file && e.pattern.test(line))) continue;
          failures.push(`${file}:${index + 1} — ${reason}: ${line.trim()}`);
        }
        if (line.includes('box-shadow:') && !TOKENIZED_BOX_SHADOW.test(line)) {
          failures.push(`${file}:${index + 1} — box-shadow fora dos tokens: ${line.trim()}`);
        }
      });
    }
    expect(failures).toEqual([]);
  });
});
