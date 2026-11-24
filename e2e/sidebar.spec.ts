import { credentialsAvailable, expect, missingCredentialsMessage, test } from './helpers';

test.describe('sidebar', () => {
  test.skip(!credentialsAvailable, missingCredentialsMessage);

  test('colapsa no desktop sem scroll horizontal', async ({ authenticatedPage }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('desktop'), 'Toggle da sidebar é desktop.');
    const page = authenticatedPage;

    await page.goto('/painel');
    const toggle = page.getByTestId('sidebar-toggle');
    await expect(toggle).toBeVisible({ timeout: 20_000 });

    const hasNoHorizontalScroll = (): Promise<boolean> =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

    expect(await hasNoHorizontalScroll()).toBe(true);
    const labelBefore = await toggle.getAttribute('aria-label');
    const contentWidthBefore = (await page.locator('main').first().boundingBox())?.width ?? 0;

    await toggle.click();
    await expect(toggle).not.toHaveAttribute('aria-label', labelBefore ?? '');
    expect(await page.evaluate(() => localStorage.getItem('apupu.sidebar.collapsed'))).toBe('true');
    expect(await hasNoHorizontalScroll()).toBe(true);
    const contentWidthAfter = (await page.locator('main').first().boundingBox())?.width ?? 0;
    expect(contentWidthAfter).toBeGreaterThan(contentWidthBefore);

    await toggle.click();
    expect(await page.evaluate(() => localStorage.getItem('apupu.sidebar.collapsed'))).toBe('false');
    expect(await hasNoHorizontalScroll()).toBe(true);
  });
});
