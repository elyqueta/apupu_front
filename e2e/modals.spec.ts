import {
  credentialsAvailable,
  expect,
  expectDialogModal,
  missingCredentialsMessage,
  test,
} from './helpers';

test.describe('modais', () => {
  test.skip(!credentialsAvailable, missingCredentialsMessage);

  test('formulários em 360×640 abrem em dialog com Guardar alcançável', async (
    { authenticatedPage },
    testInfo,
  ) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'Cenário de teclado virtual em mobile.');
    const page = authenticatedPage;

    await page.goto('/perfil');
    await page.getByTestId('profile-edit').click();
    const profileModal = await expectDialogModal(page);

    const name = profileModal.locator('#app-profile-form input[formcontrolname="displayName"]');
    const originalName = await name.inputValue();
    await name.click();
    await page.keyboard.insertText(' Teste e2e');
    await name.fill(originalName);

    await page.getByTestId('app-modal-body').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const profileSave = page
      .getByTestId('app-modal-footer')
      .getByRole('button', { name: /Guardar|Save/i });
    await expect(profileSave).toBeVisible();
    await profileSave.click();
    await expect(profileModal).toBeHidden({ timeout: 20_000 });

    await page.goto('/convidados');
    await page.getByTestId('guests-add').click();
    const guestModal = await expectDialogModal(page);

    const phone = guestModal.locator('#app-guest-form input[formcontrolname="phone"]');
    await phone.click();
    await page.keyboard.insertText('912 345 678');

    await page.getByTestId('app-modal-body').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const guestSave = page
      .getByTestId('app-modal-footer')
      .getByRole('button', { name: /Adicionar convidado|Add guest/i });
    await expect(guestSave).toBeVisible();
    await guestSave.click();

    // Nome e email ficam vazios de propósito: a validação impede criar dados de teste.
    await expect(guestModal.getByText(/obrigatóri|required/i).first()).toBeVisible();
    await guestModal.getByRole('button', { name: /Cancelar|Cancel/i }).click();
    await expect(guestModal).toBeHidden();
  });

  test('modal de leitura permanece como bottom sheet em mobile', async (
    { authenticatedPage },
    testInfo,
  ) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'Bottom sheet é o padrão mobile.');
    const page = authenticatedPage;

    await page.goto('/admin/utilizadores');
    const viewButton = page.getByTestId('admin-user-view').first();
    await expect(viewButton).toBeVisible({ timeout: 20_000 });
    await viewButton.click();

    const modal = page.getByTestId('app-modal');
    await expect(modal).toHaveAttribute('data-presentation', 'sheet');

    const panelBox = await modal.getByRole('dialog').boundingBox();
    const viewport = page.viewportSize();
    expect(panelBox).not.toBeNull();
    if (panelBox && viewport) {
      expect(panelBox.y + panelBox.height).toBeGreaterThanOrEqual(viewport.height - 2);
    }

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });
});
