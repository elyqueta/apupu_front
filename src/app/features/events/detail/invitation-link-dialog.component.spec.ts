import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../../core/i18n/i18n.service';
import { InvitationLinkDialogComponent } from './invitation-link-dialog.component';

const MAX = '2026-12-20';

function setup(): ComponentFixture<InvitationLinkDialogComponent> {
  TestBed.configureTestingModule({
    imports: [InvitationLinkDialogComponent],
    providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
  });
  const fixture = TestBed.createComponent(InvitationLinkDialogComponent);
  fixture.componentRef.setInput('open', true);
  fixture.componentRef.setInput('guestName', 'Ana');
  fixture.componentRef.setInput('maxDate', MAX);
  fixture.detectChanges();
  return fixture;
}

describe('InvitationLinkDialogComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('mostra o limite máximo e envia a data escolhida em ISO', async () => {
    const fixture = setup();
    const native = fixture.nativeElement as HTMLElement;
    const i18n = TestBed.inject(I18nService);

    expect(native.textContent).toContain(i18n.t('eventDetail.linkValidity'));
    expect(native.textContent).toContain(i18n.shortDate(MAX, 'UTC'));

    let emitted = '';
    fixture.componentInstance.saved.subscribe((value) => (emitted = value));
    const input = native.querySelector('[data-testid="invitation-link-date"]') as HTMLInputElement;
    input.value = '2026-12-10';
    input.dispatchEvent(new Event('input'));
    (native.querySelector('[data-testid="invitation-link-save"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(emitted).toBe('2026-12-10T23:59:59.000Z');
  });

  it('não emite uma data além do limite do backend', async () => {
    const fixture = setup();
    const native = fixture.nativeElement as HTMLElement;
    let emitted = '';
    fixture.componentInstance.saved.subscribe((value) => (emitted = value));

    const input = native.querySelector('[data-testid="invitation-link-date"]') as HTMLInputElement;
    input.value = '2026-12-31';
    input.dispatchEvent(new Event('input'));
    (native.querySelector('[data-testid="invitation-link-save"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(emitted).toBe('');
    expect(native.textContent).toContain(
      TestBed.inject(I18nService).t('eventDetail.linkValidityInvalid'),
    );
  });
});
