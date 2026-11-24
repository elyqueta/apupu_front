import { renderMarkdown, toHelpDoc } from './markdown.util';

describe('renderMarkdown', () => {
  it('títulos, listas, negrito e links seguros', () => {
    const html = renderMarkdown('## Passos\n1. **Um**\n2. Dois\n\n- [Ajuda](/ajuda)\n- [x](javascript:alert(1))');
    expect(html).toContain('<h3>Passos</h3>');
    expect(html).toContain('<ol>');
    expect(html).toContain('<strong>Um</strong>');
    expect(html).toContain('<a href="/ajuda">Ajuda</a>');
    expect(html).not.toContain('href="javascript');
    expect(html).toContain('<ul>');
  });

  it('escapa HTML do texto', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it('extrai o título do guia', () => {
    const doc = toHelpDoc('x', '# Título\n\nTexto **forte**.');
    expect(doc.title).toBe('Título');
    expect(doc.html).toBe('<p>Texto <strong>forte</strong>.</p>');
  });
});
