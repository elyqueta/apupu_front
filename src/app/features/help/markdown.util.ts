/**
 * Renderer mínimo de Markdown para os guias de ajuda (Bloco 12), sem
 * dependências: títulos (#, ##), listas (-, 1.), negrito (**), links
 * ([texto](url) internos ou https) e parágrafos. O texto é escapado antes
 * de qualquer marcação, por isso o HTML de saída é seguro.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(((?:\/|https:\/\/)[^)\s]*)\)/g, '<a href="$2">$1</a>');
}

export interface HelpDoc {
  id: string;
  title: string;
  html: string;
  text: string;
}

export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = (): void => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+\.\s+(.*)$/.exec(line);
    if (!line) {
      flushParagraph();
      closeList();
    } else if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(heading[1].length + 1, 4);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (bullet || numbered) {
      flushParagraph();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      const item = (bullet ?? numbered) as RegExpExecArray;
      out.push(`<li>${inline(item[1])}</li>`);
    } else {
      closeList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  closeList();
  return out.join('\n');
}

/** Converte um ficheiro de guia (título na primeira linha `# `) em `HelpDoc`. */
export function toHelpDoc(id: string, source: string): HelpDoc {
  const firstLine = source.split('\n').find((line) => line.startsWith('# ')) ?? id;
  const title = firstLine.replace(/^#\s+/, '').trim();
  const body = source.replace(firstLine, '').trim();
  return { id, title, html: renderMarkdown(body), text: `${title} ${body}`.toLowerCase() };
}
