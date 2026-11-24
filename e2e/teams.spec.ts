import { credentialsAvailable, expect, missingCredentialsMessage, test } from './helpers';

test.skip(!credentialsAvailable, missingCredentialsMessage);

test('o avatar de um membro abre um sheet de leitura no cartão da equipa', async ({
  authenticatedPage: page,
}) => {
  await page.goto('/equipas');

  const avatar = page.locator('[data-testid^="avatar-member-"]').first();
  if ((await avatar.count()) === 0) {
    test.skip(true, 'A conta de teste não tem equipas com membros.');
    return;
  }

  await avatar.click();
  const modal = page.getByTestId('app-modal');
  await expect(modal).toHaveAttribute('data-presentation', 'sheet');
  await expect(page.getByTestId('team-member-detail')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
});
