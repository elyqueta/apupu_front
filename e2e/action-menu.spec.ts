import {
  credentialsAvailable,
  expect,
  expectActionMenuBeside,
  missingCredentialsMessage,
  test,
} from './helpers';

const routes = ['/convidados', '/admin/utilizadores', '/equipas'];

test.describe('menu de ações', () => {
  test.skip(!credentialsAvailable, missingCredentialsMessage);

  for (const route of routes) {
    test(`primeiro e último cartão ficam visíveis em ${route}`, async ({ authenticatedPage }) => {
      await authenticatedPage.goto(route);

      const triggers = authenticatedPage.locator('button[aria-haspopup="menu"]');
      await expect(triggers.first()).toBeVisible({ timeout: 20_000 });

      const count = await triggers.count();
      await expectActionMenuBeside(authenticatedPage, triggers.first());
      if (count > 1) {
        await expectActionMenuBeside(authenticatedPage, triggers.last());
      }
    });
  }
});
