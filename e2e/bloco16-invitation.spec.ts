/**
 * Bloco 16 — convite real do Gratitude com três localizações.
 *
 * Usa a rota auto-contida `/__test/invitation` (sem backend nem credenciais)
 * e corre nos 4 projetos de viewport do Playwright.
 */
import { expect, test } from '@playwright/test';

test.describe('Bloco 16 — convite e folha de informações', () => {
  test.skip(!process.env['E2E_BASE_URL'], 'Define E2E_BASE_URL para correr esta spec.');

  test.beforeEach(async ({ page }) => {
    await page.goto('/__test/invitation', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('gratitude-invitation')).toBeVisible();
  });

  test('sem logótipo nem alternador de tema; cartaz e barra cabem no ecrã', async ({ page }) => {
    expect(await page.locator('app-brand').count()).toBe(0);
    expect(await page.locator('app-preference-controls').count()).toBe(0);
    expect(await page.locator('img[alt="Logótipo"]').count()).toBe(0);
    expect(await page.getByTestId('gratitude-title').count()).toBe(1);

    const poster = await page.getByTestId('gratitude-invitation').boundingBox();
    expect(poster).not.toBeNull();
    const viewport = page.viewportSize()!;

    if (viewport.width < 1024) {
      const bar = await page.getByTestId('inv-rsvp-bar').boundingBox();
      expect(bar).not.toBeNull();
      expect(poster!.y + poster!.height, 'cartaz não pode passar por cima da barra RSVP').toBeLessThanOrEqual(
        bar!.y + 4,
      );
      expect(poster!.y + poster!.height).toBeLessThanOrEqual(viewport.height);
    } else {
      expect(poster!.width).toBeLessThanOrEqual(viewport.width);
    }
  });

  test('o FAB tem cor do template e abre a folha com três locais', async ({ page }) => {
    const fab = page.getByTestId('inv-fab');
    await expect(fab).toBeVisible();
    await expect(fab).toHaveAttribute('aria-haspopup', 'dialog');
    const box = await fab.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);

    const colours = await page.evaluate(() => {
      const shell = document.querySelector('app-invitation-shell') as HTMLElement;
      const button = document.querySelector('[data-testid="inv-fab"]') as HTMLElement;
      return {
        accent: getComputedStyle(shell).getPropertyValue('--inv-accent').trim(),
        background: getComputedStyle(button).backgroundColor,
      };
    });
    expect(colours.accent).not.toBe('');
    expect(colours.background).not.toBe('rgba(0, 0, 0, 0)');

    await fab.click();
    const sheet = page.locator('app-invitation-info-sheet [data-testid="app-modal"]');
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId('inv-section-locations')).toBeVisible();

    const cards = page.locator('[data-testid="inv-section-locations"] article');
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toHaveAttribute('data-primary', 'true');
    await expect(cards.nth(0).getByTestId('inv-primary-badge')).toBeVisible();
    await expect(cards.nth(0)).toContainText('Rua São João, 12, Luanda');
    await expect(cards.nth(0).getByTestId('inv-location-maps')).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=-8.838333,13.234445',
    );
    await expect(cards.nth(1)).toContainText('Salão Principal');
    await expect(cards.nth(2).getByTestId('inv-location-link')).toHaveAttribute(
      'href',
      'https://exemplo.ao/direto',
    );

    await expect(page.getByTestId('inv-section-video')).toHaveCount(0);
    await expect(page.getByTestId('inv-section-organizers')).toHaveCount(0);
    await expect(page.getByTestId('inv-section-rules')).toBeVisible();
    await expect(page.getByTestId('inv-section-share')).toBeVisible();
    await expect(page.getByTestId('inv-section-privacy')).toBeVisible();
  });

  test('Escape fecha a folha e devolve o foco ao FAB', async ({ page }) => {
    const fab = page.getByTestId('inv-fab');
    await fab.click();
    await expect(page.locator('app-invitation-info-sheet [data-testid="app-modal"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('app-invitation-info-sheet [data-testid="app-modal"]')).toHaveCount(0);
    await expect(fab).toBeFocused();
  });
});
