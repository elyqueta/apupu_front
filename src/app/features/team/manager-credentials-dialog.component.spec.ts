import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShareService } from '../../core/services/share.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ManagerCredentialsDialogComponent } from './manager-credentials-dialog.component';

const LINK = 'https://apupu.co/gerir/secret-token';
const PHONE = '+244 912 345 678';

function setup() {
  const share = {
    copy: vi.fn().mockResolvedValue(true),
    whatsappUrl: vi.fn().mockReturnValue('https://wa.me/244912345678?text=convite'),
    openExternal: vi.fn(),
  };

  TestBed.configureTestingModule({
    imports: [ManagerCredentialsDialogComponent],
    providers: [
      { provide: PLATFORM_ID, useValue: 'server' },
      { provide: ShareService, useValue: share },
    ],
  });

  const fixture = TestBed.createComponent(ManagerCredentialsDialogComponent);
  fixture.componentRef.setInput('open', true);
  fixture.componentRef.setInput('link', LINK);
  fixture.componentRef.setInput('code', 'ABC123');
  fixture.componentRef.setInput('eventTitle', 'Casamento da Ana');
  fixture.componentRef.setInput('phone', PHONE);
  fixture.componentRef.setInput('inviteStatus', 'queued');
  fixture.detectChanges();
  return { fixture, share };
}

async function settle(fixture: ComponentFixture<ManagerCredentialsDialogComponent>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('ManagerCredentialsDialogComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('mostra o código uma vez no formato XXX-XXX e confirma a cópia', async () => {
    const { fixture, share } = setup();
    const native = fixture.nativeElement as HTMLElement;

    expect(native.querySelector('[data-testid="manager-code"]')?.textContent?.trim()).toBe(
      'ABC-123',
    );

    const copyButtons = Array.from(native.querySelectorAll('button')).filter((button) =>
      button.textContent?.includes(TestBed.inject(I18nService).t('managerDialog.copy')),
    );
    const codeCopy = copyButtons.find((button) => button.closest('.bg-brand\\/5')) ?? copyButtons[1];
    (codeCopy as HTMLButtonElement).click();

    await settle(fixture);
    expect(share.copy).toHaveBeenCalledWith('ABC-123');
    expect(native.querySelector('[role="status"]')?.textContent).toContain(
      TestBed.inject(I18nService).t('managerDialog.copied'),
    );
  });

  it('partilha por WhatsApp com o número normalizado e a mensagem completa', async () => {
    const { fixture, share } = setup();
    const native = fixture.nativeElement as HTMLElement;

    (native.querySelector('[data-testid="manager-share-whatsapp"]') as HTMLButtonElement).click();

    const message = TestBed.inject(I18nService).t('managerDialog.message', {
      event: 'Casamento da Ana',
      link: LINK,
      code: 'ABC-123',
    });
    expect(share.whatsappUrl).toHaveBeenCalledWith(PHONE, message);
    expect(share.openExternal).toHaveBeenCalledWith('https://wa.me/244912345678?text=convite');
    await settle(fixture);
  });

  it('copia a mensagem completa e fecha ao concluir', async () => {
    const { fixture, share } = setup();
    const native = fixture.nativeElement as HTMLElement;
    const done = vi.fn();
    fixture.componentInstance.done.subscribe(done);

    (native.querySelector('[data-testid="manager-copy-message"]') as HTMLButtonElement).click();
    await settle(fixture);

    expect(share.copy).toHaveBeenCalledWith(
      TestBed.inject(I18nService).t('managerDialog.message', {
        event: 'Casamento da Ana',
        link: LINK,
        code: 'ABC-123',
      }),
    );

    (native.querySelector('[data-testid="manager-credentials-done"]') as HTMLButtonElement).click();
    expect(done).toHaveBeenCalledTimes(1);
  });
});
