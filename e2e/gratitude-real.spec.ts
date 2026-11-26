import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

type Box = { x: number; y: number; width: number; height: number };

function within(b: Box, name: string, w = 1024, h = 1280) {
  expect(b.x, `${name} left`).toBeGreaterThanOrEqual(-2);
  expect(b.y, `${name} top`).toBeGreaterThanOrEqual(-2);
  expect(b.x + b.width, `${name} right`).toBeLessThanOrEqual(w + 2);
  expect(b.y + b.height, `${name} bottom`).toBeLessThanOrEqual(h + 2);
}

function overlap(a: Box, b: Box, pad = 0) {
  return a.x < b.x + b.width - pad && a.x + a.width - pad > b.x && a.y < b.y + b.height - pad && a.y + a.height - pad > b.y;
}

test.describe('Gratitude real component 1024x1280', () => {
  test.use({ viewport: { width: 1024, height: 1280 } });

  for (const c of ['a', 'b', 'c', 'd'] as const) {
    test(`case ${c}`, async ({ page }) => {
      await page.goto(`/__test/gratitude/${c}`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="gratitude-invitation"]').waitFor();
      await page.evaluate(async () => {
        // @ts-ignore
        if (document.fonts?.ready) await document.fonts.ready;
      });
      await page.waitForTimeout(400);

      const poster = page.locator('.poster').first();
      const posterBox = await poster.boundingBox();
      expect(posterBox).toBeTruthy();
      const P = posterBox!;
      // normalize to poster-local coords
      const box = async (sel: string) => {
        const b = await page.locator(sel).first().boundingBox();
        expect(b, sel).toBeTruthy();
        return { x: b!.x - P.x, y: b!.y - P.y, width: b!.width, height: b!.height };
      };

      const org = await box('[data-testid="gratitude-org"]');
      const sub = await box('[data-testid="gratitude-subtitle"]');
      const title = await box('[data-testid="gratitude-title"]');
      const year = await box('[data-testid="gratitude-highlight"]');
      const info = await box('[data-testid="gratitude-info"]');
      [org, sub, title, year, info].forEach((b, i) => within(b, ['org','sub','title','year','info'][i], P.width, P.height));

      // no consecutive overlap
      expect(overlap(org, sub), 'org/sub overlap').toBeFalsy();
      expect(overlap(sub, title), 'sub/title overlap').toBeFalsy();
      expect(overlap(title, year), 'title/year overlap').toBeFalsy();
      expect(overlap(year, info), 'year/info overlap').toBeFalsy();

      // title-year gap <= 3%H
      const gapTY = (year.y - (title.y + title.height)) / P.height;
      expect(gapTY, `gapTY ${gapTY}`).toBeLessThanOrEqual(0.03);

      // info row: local text starts right of icon bbox
      const loc = await box('[data-testid="gratitude-info"] .loc');
      const locIcon = await page.locator('[data-testid="gratitude-info"] .loc svg').first().boundingBox();
      const locText = await page.locator('[data-testid="gratitude-info"] .loc .t').first().boundingBox();
      expect(locIcon).toBeTruthy();
      expect(locText).toBeTruthy();
      const iconRight = locIcon!.x - P.x + locIcon!.width;
      const textLeft = locText!.x - P.x;
      expect(textLeft, `loc text left ${textLeft} iconRight ${iconRight}`).toBeGreaterThanOrEqual(iconRight - 1);

      // QR card above bottom ribbon bezier - geometric check using known bezier and card bbox
      const qrCard = page.locator('[data-testid="gratitude-qr"] .qrcard').first();
      if (await qrCard.count()) {
        const qr = await qrCard.boundingBox();
        expect(qr).toBeTruthy();
        const q = { x: qr!.x - P.x, y: qr!.y - P.y, w: qr!.width, h: qr!.height };
        // bottom ribbon bezier: M540 1280 C700 1215 900 1110 1024 1000 in 1024x1280 space; scale to poster
        const sx = P.width / 1024;
        const sy = P.height / 1280;
        const bx = (t: number) => (540*(1-t)**3 + 3*700*t*(1-t)**2 + 3*900*t*t*(1-t) + 1024*t**3) * sx;
        const by = (t: number) => (1280*(1-t)**3 + 3*1215*t*(1-t)**2 + 3*1110*t*t*(1-t) + 1000*t**3) * sy;
        // sample bezier; card bottom must be above bezier y at card x range
        let minClear = Infinity;
        for (let i = 0; i <= 100; i++) {
          const t = i / 100;
          const x = bx(t), y = by(t);
          if (x >= q.x && x <= q.x + q.w) minClear = Math.min(minClear, y - (q.y + q.h));
        }
        expect(minClear, `qr ribbon clearance ${minClear}`).toBeGreaterThan(0);
      }

      // dress code if present
      if (c === 'c' || c === 'd') {
        const dress = await box('[data-testid="gratitude-dresscode"]');
        within(dress, 'dress', P.width, P.height);
        expect(overlap(info, dress), 'info/dress overlap').toBeFalsy();
      } else {
        await expect(page.locator('[data-testid="gratitude-dresscode"]')).toBeHidden();
      }

      // logo presence
      if (c === 'b' || c === 'd') {
        await expect(page.locator('[data-testid="gratitude-logo-wrap"]')).toBeVisible();
      } else {
        await expect(page.locator('[data-testid="gratitude-logo-wrap"]')).toHaveCount(0);
      }

      const outDir = resolve(__dirname, '../../docs/assets');
      mkdirSync(outDir, { recursive: true });
      await poster.screenshot({ path: resolve(outDir, `gratitude-${c}.png`) });
    });
  }
});
