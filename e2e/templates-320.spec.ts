/**
 * Bloco 15B — validação automatizada e real (render Angular) dos 19 templates
 * de sistema a 320 px. A rota `__test/templates` é auto-contida: não exige
 * sessão, backend nem `E2E_EMAIL`/`E2E_PASSWORD`, apenas `E2E_BASE_URL`.
 */
import { expect, test } from '@playwright/test';

/** Ordem canónica de `SYSTEM_TEMPLATES` (`src/app/core/data/system-templates.ts`). */
const EXPECTED_SLUGS = [
  't01-papel-creme',
  't03-hacienda-marfim',
  't05-foto-desvanece',
  't08-salvia-eucalipto',
  't11-preto-dourado',
  't13-gradiente-verde-azul',
  't17-confraternizacao-dourada',
  't02-envelope-terracota',
  't04-marfim-folhas',
  't06-bordo-envelope',
  't07-preto-branco-rasgado',
  't09-arco-bordo-dourado',
  't10-forma-organica-verde',
  't12-papel-recortado-rosa',
  't14-cartao-creme-dourado',
  't15-digital-premium',
  't16-envelope-corporativo',
  't18-gala-ouro-carvao',
  't19-conferencia-tecnologica',
] as const;

const VIEWPORT = { width: 320, height: 640 };
const MIN_FONT_SIZE = 10;
const TOLERANCE = 2;

interface TitleMetrics {
  text: string;
  fontSize: number;
  scrollWidth: number;
  clientWidth: number;
  left: number;
  right: number;
}

interface TextMetrics {
  text: string;
  tag: string;
  fontSize: number;
}

test.describe('Bloco 15B — 19 templates a 320 px', () => {
  test.use({ viewport: VIEWPORT });
  test.skip(!process.env['E2E_BASE_URL'], 'Define E2E_BASE_URL para correr esta spec.');

  test('cartão visível, sem overflow, texto ≥10 px e título sem corte', async ({ page }) => {
    await page.goto('/__test/templates', { waitUntil: 'domcontentloaded' });

    const cases = page.locator('[data-testid="template-case"]');
    await expect(cases).toHaveCount(EXPECTED_SLUGS.length);
    const slugs = await cases.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-template-slug') ?? ''),
    );
    expect(slugs, 'catálogo de sistema renderizado').toEqual([...EXPECTED_SLUGS]);

    // Evita medir enquanto as fontes (com fallback local) ainda estão a trocar.
    await page.evaluate(async () => {
      await Promise.race([
        document.fonts?.ready ?? Promise.resolve(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    });

    for (const [index, slug] of slugs.entries()) {
      await test.step(slug, async () => {
        const testCase = cases.nth(index);
        const card = testCase.getByTestId('template-card');
        await expect(testCase).toBeVisible();
        await expect(card).toBeVisible();

        const box = await card.boundingBox();
        expect(box, `${slug}: caixa do cartão`).not.toBeNull();
        expect(box!.width, `${slug}: largura do cartão`).toBeGreaterThan(200);
        expect(box!.height, `${slug}: altura do cartão`).toBeGreaterThan(40);

        // Overflow horizontal do cartão (mesmo quando o renderer usa overflow:hidden).
        const cardMetrics = await card.evaluate((el) => ({
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        }));
        expect(
          cardMetrics.scrollWidth,
          `${slug}: scrollWidth do cartão ${cardMetrics.scrollWidth} > clientWidth ${cardMetrics.clientWidth}`,
        ).toBeLessThanOrEqual(cardMetrics.clientWidth + TOLERANCE);

        // Overflow horizontal do documento inteiro.
        const doc = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyScrollWidth: document.body.scrollWidth,
          bodyClientWidth: document.body.clientWidth,
        }));
        expect(
          doc.scrollWidth,
          `${slug}: documento com scroll horizontal (${doc.scrollWidth} > ${doc.clientWidth})`,
        ).toBeLessThanOrEqual(doc.clientWidth + TOLERANCE);
        expect(
          doc.bodyScrollWidth,
          `${slug}: body com scroll horizontal (${doc.bodyScrollWidth} > ${doc.bodyClientWidth})`,
        ).toBeLessThanOrEqual(doc.bodyClientWidth + TOLERANCE);

        // Todos os elementos com texto próprio devem ter fonte efetiva legível.
        const texts = await card.evaluate((root): TextMetrics[] => {
          const nodes = Array.from(root.querySelectorAll('h1, h2, h3, p, span, div, li, button'));
          return nodes
            .filter((el) => el.getClientRects().length > 0)
            .filter((el) =>
              Array.from(el.childNodes).some(
                (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
              ),
            )
            .map((el) => ({
              text: (el.textContent ?? '').trim().slice(0, 80),
              tag: el.tagName,
              fontSize: parseFloat(getComputedStyle(el).fontSize),
            }));
        });
        expect(texts.length, `${slug}: sem texto renderizado`).toBeGreaterThan(0);
        for (const item of texts) {
          expect(
            item.fontSize,
            `${slug}: <${item.tag}> "${item.text}" com ${item.fontSize}px`,
          ).toBeGreaterThanOrEqual(MIN_FONT_SIZE - 0.01);
        }

        // Título: texto presente, sem corte horizontal e dentro do cartão.
        const titles = await card.evaluate((root): TitleMetrics[] => {
          const cardRect = root.getBoundingClientRect();
          return Array.from(root.querySelectorAll('[data-block-type="title"] h2, h2')).map((el) => {
            const rect = el.getBoundingClientRect();
            return {
              text: (el.textContent ?? '').trim(),
              fontSize: parseFloat(getComputedStyle(el).fontSize),
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              left: rect.left - cardRect.left,
              right: rect.right - cardRect.left,
            };
          });
        });
        expect(titles.length, `${slug}: sem bloco de título`).toBeGreaterThan(0);
        for (const title of titles) {
          expect(title.text.length, `${slug}: título vazio`).toBeGreaterThan(0);
          expect(title.fontSize, `${slug}: título "${title.text}"`).toBeGreaterThanOrEqual(
            MIN_FONT_SIZE - 0.01,
          );
          expect(
            title.scrollWidth,
            `${slug}: título "${title.text}" cortado (${title.scrollWidth} > ${title.clientWidth})`,
          ).toBeLessThanOrEqual(title.clientWidth + TOLERANCE);
          expect(title.left, `${slug}: título "${title.text}" fora do cartão à esquerda`).toBeGreaterThanOrEqual(-TOLERANCE);
          expect(
            title.right,
            `${slug}: título "${title.text}" fora do cartão à direita`,
          ).toBeLessThanOrEqual(box!.width + TOLERANCE);
        }
      });
    }
  });
});
