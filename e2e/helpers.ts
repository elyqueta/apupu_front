import { expect, test as base, type Locator, type Page } from '@playwright/test';

const email = process.env['E2E_EMAIL'];
const password = process.env['E2E_PASSWORD'];
const baseURL = process.env['E2E_BASE_URL'];

interface Fixtures {
  authenticatedPage: Page;
}

export const credentialsAvailable = Boolean(email && password && baseURL);
export const missingCredentialsMessage =
  'Define E2E_EMAIL, E2E_PASSWORD e E2E_BASE_URL para correr os testes e2e.';

export const test = base.extend<Fixtures>({
  authenticatedPage: async ({ page }, use, testInfo) => {
    if (!email || !password || !baseURL) {
      testInfo.skip(true, missingCredentialsMessage);
      return;
    }

    await page.goto('/entrar');
    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill(password);
    await page.locator('form button[type="submit"]').first().click();
    await page.waitForURL((url) => !url.pathname.endsWith('/entrar'), { timeout: 20_000 });
    await use(page);
  },
});

export { expect };

export async function expectActionMenuBeside(page: Page, trigger: Locator): Promise<void> {
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const panel = page.getByTestId('action-menu-panel');
  await expect(panel).toBeVisible();

  const buttonBox = await trigger.boundingBox();
  const panelBox = await panel.boundingBox();
  const viewport = page.viewportSize();
  expect(buttonBox).not.toBeNull();
  expect(panelBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!buttonBox || !panelBox || !viewport) return;

  const tolerance = 1;
  expect(panelBox.x).toBeGreaterThanOrEqual(-tolerance);
  expect(panelBox.y).toBeGreaterThanOrEqual(-tolerance);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width + tolerance);
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height + tolerance);

  const horizontallyAligned =
    panelBox.x <= buttonBox.x + buttonBox.width && panelBox.x + panelBox.width >= buttonBox.x;
  const above = panelBox.y + panelBox.height <= buttonBox.y + tolerance;
  const below = panelBox.y >= buttonBox.y + buttonBox.height - tolerance;
  expect(horizontallyAligned).toBe(true);
  expect(above || below).toBe(true);

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
}

export async function expectDialogModal(page: Page): Promise<Locator> {
  const modal = page.getByTestId('app-modal');
  await expect(modal).toHaveAttribute('data-presentation', 'dialog');

  const viewport = page.viewportSize();
  const panelBox = await modal.getByRole('dialog').boundingBox();
  expect(panelBox).not.toBeNull();
  if (panelBox && viewport) {
    expect(panelBox.width).toBeLessThanOrEqual(viewport.width);
    expect(panelBox.height).toBeLessThanOrEqual(viewport.height);
  }
  return modal;
}
