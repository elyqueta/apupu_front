import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../../core/i18n/i18n.service';
import { InvitationRsvpDialogComponent } from './invitation-rsvp-dialog.component';

function setup(response: 'accepted' | 'declined' = 'accepted') {
  TestBed.configureTestingModule({
    imports: [InvitationRsvpDialogComponent],
    providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
  });
  const fixture = TestBed.createComponent(InvitationRsvpDialogComponent);
  fixture.componentRef.setInput('open', true);
  fixture.componentRef.setInput('response', response);
  fixture.detectChanges();
  return fixture;
}

async function settle(fixture: ComponentFixture<InvitationRsvpDialogComponent>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

function typeMessage(fixture: ComponentFixture<InvitationRsvpDialogComponent>, value: string): void {
  const textarea = fixture.nativeElement.querySelector(
    '[data-testid="invitation-rsvp-message"]',
  ) as HTMLTextAreaElement;
  textarea.value = value;
  textarea.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

describe('InvitationRsvpDialogComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('envia a mensagem opcional com a resposta e limita o texto a 500 caracteres', async () => {
    const fixture = setup();
    const confirmed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);
    await settle(fixture);

    const textarea = fixture.nativeElement.querySelector(
      '[data-testid="invitation-rsvp-message"]',
    ) as HTMLTextAreaElement;
    expect(textarea.getAttribute('maxlength')).toBe('500');

    typeMessage(fixture, 'x'.repeat(520));
    const counter = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(counter).toContain('500/500');

    (fixture.nativeElement.querySelector('[data-testid="invitation-rsvp-confirm"]') as HTMLButtonElement).click();
    expect(confirmed).toHaveBeenCalledTimes(1);
    expect(confirmed).toHaveBeenCalledWith({ status: 'accepted', message: 'x'.repeat(500) });
  });

  it('envia mensagem nula quando o campo fica vazio', async () => {
    const fixture = setup('declined');
    const confirmed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);
    await settle(fixture);

    typeMessage(fixture, '   ');
    (fixture.nativeElement.querySelector('[data-testid="invitation-rsvp-confirm"]') as HTMLButtonElement).click();

    expect(confirmed).toHaveBeenCalledWith({ status: 'declined', message: null });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      TestBed.inject(I18nService).t('invitation.declineTitle'),
    );
  });
});
